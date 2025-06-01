import os
import json
import uuid
from flask import Flask, send_from_directory, jsonify, request, make_response # Adicionado make_response
import firebase_admin
from firebase_admin import credentials, firestore, storage
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timezone, timedelta
import requests
import re
from collections import Counter, defaultdict
import traceback
from flask_cors import CORS
# Removido 'from google.cloud import secretmanager' do topo, será importado condicionalmente.

import time
initialization_start_time = time.time()

# --- 0) Configurações iniciais e instanciação do Flask ---
app = Flask(__name__, static_folder='src', static_url_path='')
print(f"Flask app instanciado em {time.time() - initialization_start_time:.4f} segundos.")

CORS(app, 
     origins=["https://arture07.github.io", "http://localhost:8080", "http://127.0.0.1:8080", "https://arture07-github-io.onrender.com"], # Adicionada URL do Render
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"], 
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization"]
)

print(f"CORS configurado em {time.time() - initialization_start_time:.4f} segundos.")

db = None
bucket = None
firebase_initialized_successfully = False
FIREBASE_PROJECT_ID_CONST = "biblioteca-py-6b33e" 
STORAGE_BUCKET_NAME_CONST = f"{FIREBASE_PROJECT_ID_CONST}.appspot.com"

# --- 1) Carregar credenciais e inicializar Firebase ---
def initialize_firebase():
    global db, bucket, firebase_initialized_successfully
    if firebase_initialized_successfully:
        return

    firebase_init_start_time = time.time()
    print("[FIREBASE_INIT] Iniciando inicialização do Firebase...")
    cred = None
    
    # Tentar carregar credenciais da variável de ambiente (ideal para Render)
    firebase_credentials_json_str = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    if firebase_credentials_json_str:
        try:
            service_account_info = json.loads(firebase_credentials_json_str)
            cred = credentials.Certificate(service_account_info)
            print(f"[FIREBASE_INIT] Credenciais carregadas da variável de ambiente FIREBASE_CREDENTIALS_JSON.")
        except Exception as e_env_cred:
            print(f"[FIREBASE_INIT_WARN] Falha ao carregar credenciais da variável de ambiente: {e_env_cred}. Tentando outros métodos...")
            cred = None # Garante que cred seja None se a variável falhar

    # Se não carregou da variável de ambiente, tenta a lógica original (Secret Manager ou arquivo local)
    if not cred:
        try:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            if project_id: # Lógica para Google Cloud Run / Secret Manager
                print("[FIREBASE_INIT] Ambiente Google Cloud detectado. Tentando Secret Manager...")
                from google.cloud import secretmanager # Importa apenas quando necessário
                secret_name = os.environ.get("SECRET_NAME", "firebase-sa-json") 
                secret_client = secretmanager.SecretManagerServiceClient()
                secret_path = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
                secret_response = secret_client.access_secret_version(request={"name": secret_path})
                service_account_info = json.loads(secret_response.payload.data.decode("UTF-8"))
                cred = credentials.Certificate(service_account_info)
                print(f"[FIREBASE_INIT] Credenciais carregadas do Secret Manager.")
            else:
                # Se não é Cloud Run e não usou variável de ambiente, tenta arquivo local
                raise EnvironmentError("Não é ambiente Google Cloud e FIREBASE_CREDENTIALS_JSON não definida.")
        except Exception as e_sm_or_env:
            print(f"[FIREBASE_INIT_WARN] Falha Secret Manager ou detecção de ambiente ({type(e_sm_or_env).__name__}: {e_sm_or_env}). Tentando arquivo local...")
            chave_json_path_local = os.path.join(os.path.dirname(__file__), "biblioteca-py-6b33e-firebase-adminsdk-fbsvc-bd95a47a25.json")
            if os.path.exists(chave_json_path_local):
                try:
                    cred = credentials.Certificate(chave_json_path_local)
                    print(f"[FIREBASE_INIT] Credenciais carregadas de arquivo local: {chave_json_path_local}")
                except Exception as e_file_cred:
                    print(f"[FIREBASE_INIT_FATAL] Erro ao carregar credenciais do arquivo local '{chave_json_path_local}': {e_file_cred}")
                    cred = None # Garante que cred é None se o arquivo falhar
            else:
                print(f"[FIREBASE_INIT_FATAL] Arquivo local de credenciais '{chave_json_path_local}' não encontrado e nenhum outro método funcionou.")
                cred = None

    if cred:
        try:
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred, {'storageBucket': STORAGE_BUCKET_NAME_CONST})
            db = firestore.client()
            bucket = storage.bucket() 
            firebase_initialized_successfully = True
            print(f"[FIREBASE_INIT] Firebase SDK inicializado. 'db' e 'bucket' estão configurados. Tempo total de init: {time.time() - firebase_init_start_time:.4f}s.")
        except Exception as e_init_sdk:
            print(f"[FIREBASE_INIT_FATAL] Erro ao inicializar Firebase SDK: {e_init_sdk}")
            traceback.print_exc()
            firebase_initialized_successfully = False # Garante que está falso
    else:
        print("[FIREBASE_INIT_FATAL] Nenhuma credencial Firebase válida foi carregada.")
        firebase_initialized_successfully = False # Garante que está falso
        
from functools import wraps
def ensure_firebase_initialized(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not firebase_initialized_successfully:
            print("[DECORATOR_WARN] Firebase não estava inicializado. Tentando inicializar agora...")
            initialize_firebase() 
            if not firebase_initialized_successfully:
                print("[API_ERROR] Firebase não inicializado. Rota não pode prosseguir.")
                return jsonify({"sucesso": False, "erro": "Erro crítico do servidor: Falha na conexão com serviços essenciais."}), 503
        if not db: 
             print("[API_ERROR] Conexão Firestore (db) indisponível. Rota não pode prosseguir.")
             return jsonify({"sucesso": False, "erro": "Erro crítico do servidor: Conexão com banco de dados perdida."}), 503
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        # O Flask-CORS já deve lidar com isso adequadamente com base na configuração global.
        # Esta função manual pode ser redundante ou causar conflitos se o Flask-CORS estiver ativo.
        # Considere remover ou simplificar se o Flask-CORS estiver configurado corretamente.
        print("[PREFLIGHT_DEBUG] Recebida requisição OPTIONS.")
        res = make_response()
        # Deixe o Flask-CORS adicionar o Access-Control-Allow-Origin dinamicamente.
        # res.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin')) 
        
        # Cabeçalhos que o cliente pode enviar na requisição real
        allowed_headers = request.headers.get('Access-Control-Request-Headers')
        if allowed_headers:
            res.headers.add('Access-Control-Allow-Headers', allowed_headers)
        
        # Métodos que o cliente pode usar na requisição real
        allowed_methods = request.headers.get('Access-Control-Request-Methods')
        if allowed_methods:
            res.headers.add('Access-Control-Allow-Methods', allowed_methods)
        
        res.headers.add('Access-Control-Allow-Credentials', 'true')
        res.headers.add('Access-Control-Max-Age', '3600') # Cache preflight por 1 hora
        print(f"[PREFLIGHT_DEBUG] Respondendo OPTIONS com headers: {res.headers}")
        return res, 200


# --- Constantes do app ---
ASSIGNABLE_ROLES = ['admin', 'catalogador', 'atendente', 'analista']
ALL_USER_ROLES = ['cliente'] + ASSIGNABLE_ROLES
VALOR_MULTA_POR_DIA = 1.50
USUARIOS_EXEMPLO = { 
    "admin@shelfwise.com": {"password_hash": generate_password_hash("admin123"), "role": "admin", "nome": "Super Admin", "status": "ATIVO"},
    "cliente1@example.com": {"password_hash": generate_password_hash("cliente123"), "role": "cliente", "nome": "Cliente Exemplo Um", "status": "ATIVO"},
    "test@teste.com": {"password_hash": generate_password_hash("teste123"), "role": "admin", "nome": "Admin Teste Login", "status": "ATIVO"},
}

# --- Funções de Usuário e Autenticação ---
def get_user_from_firestore(username_email):
    if not db:
        print("[GET_USER_ERROR] db não disponível em get_user_from_firestore")
        return None
    try:
        username_lower = str(username_email).lower()
        user_ref = db.collection('usuarios').document(username_lower)
        print(f"[FIRESTORE_TRACE] Buscando usuário: usuarios/{username_lower}")
        user_doc = user_ref.get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            user_data['id'] = user_doc.id
            user_data['username'] = username_lower 
            print(f"[FIRESTORE_TRACE] Usuário '{username_lower}' encontrado.")
            return user_data
        print(f"[FIRESTORE_TRACE] Usuário '{username_lower}' NÃO encontrado.")
        return None
    except Exception as e:
        print(f"[GET_USER_ERROR] Exceção ao buscar usuário '{username_email}': {e}")
        traceback.print_exc()
        return None

def check_user_credentials(username_email, password):
    print(f"[AUTH_ATTEMPT] Verificando credenciais para: {username_email}")
    user_data = get_user_from_firestore(username_email)

    if user_data:
        if user_data.get('status') != 'ATIVO':
            print(f"[AUTH_FAIL] Usuário '{username_email}' não está ATIVO. Status: {user_data.get('status')}")
            return None 
        password_hash_from_db = user_data.get('password_hash')
        if password_hash_from_db and check_password_hash(password_hash_from_db, password):
            print(f"[AUTH_SUCCESS] Senha correta para '{username_email}'.")
            return {
                "username": user_data.get('username'),
                "role": user_data.get("role", "cliente"),
                "nome": user_data.get("nome", user_data.get('username'))
            }
        else:
            print(f"[AUTH_FAIL] Senha incorreta para '{username_email}'. Hash do DB existe: {'Sim' if password_hash_from_db else 'Não'}")
            return None
    else: 
        username_lower = str(username_email).lower()
        if username_lower in USUARIOS_EXEMPLO:
            print(f"[AUTH_ATTEMPT_EXEMPLO] Usuário '{username_lower}' encontrado nos exemplos.")
            user_exemplo_data = USUARIOS_EXEMPLO[username_lower]
            if 'password_hash' in user_exemplo_data and \
               check_password_hash(user_exemplo_data['password_hash'], password) and \
               user_exemplo_data.get('status', 'ATIVO') == 'ATIVO':
                print(f"[AUTH_SUCCESS_EXEMPLO] Login de exemplo bem-sucedido para '{username_lower}'.")
                return {"username": username_lower,
                        "role": user_exemplo_data.get("role", "cliente"),
                        "nome": user_exemplo_data.get("nome", username_lower)}
            else:
                print(f"[AUTH_FAIL_EXEMPLO] Falha no login de exemplo para '{username_lower}'.")
                return None
        else:
            print(f"[AUTH_FAIL] Usuário '{username_email}' não encontrado no Firestore nem nos exemplos.")
            return None

# --- Rotas da Aplicação (Servindo arquivos estáticos) ---
@app.route('/')
def index_page_serve(): 
    # Esta é a correção principal da linha 210
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename='index.html'):
    # Verifica se o arquivo pedido existe diretamente
    file_path = os.path.join(app.static_folder, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, filename)
    
    # Se não encontrou e o caminho não parece ser um arquivo (não tem '.'),
    # tenta servir index.html (comportamento de SPA)
    # No seu caso, como você tem rotas explícitas para cada HTML, isso pode não ser necessário
    # ou pode precisar de ajuste se você quiser que /alguma-coisa sirva index.html.
    # Para servir arquivos específicos, as rotas abaixo são melhores.
    # if not '.' in filename: # Ou alguma outra lógica para identificar rotas de SPA
    #     index_path = os.path.join(app.static_folder, 'index.html')
    #     if os.path.exists(index_path):
    #         return send_from_directory(app.static_folder, 'index.html')
            
    return jsonify({"erro": "Arquivo não encontrado"}), 404

# Rotas explícitas para cada arquivo HTML principal
@app.route('/login.html')
def login_page(): 
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/register.html') # Adicionando rota para register.html se existir
def register_page():
    return send_from_directory(app.static_folder, 'register.html')

@app.route('/gerenciar_emprestimos.html')
def manage_loans_page():
    return send_from_directory(app.static_folder, 'gerenciar_emprestimos.html')

@app.route('/gerenciar_usuarios.html')
def manage_users_page_route(): 
    return send_from_directory(app.static_folder, 'gerenciar_usuarios.html')

@app.route('/relatorios_admin.html')
def reports_admin_page_route(): 
    return send_from_directory(app.static_folder, 'relatorios_admin.html')

@app.route('/gerenciar_sugestoes.html')
def manage_suggestions_page_route():
    return send_from_directory(app.static_folder, 'gerenciar_sugestoes.html')


# --- API Endpoints ---
@app.route('/api/login', methods=['POST']) 
@ensure_firebase_initialized
def login_api():
    login_processing_start_time = time.time()
    print(f"[LOGIN_API_INFO] Rota /api/login chamada. Firebase inicializado: {firebase_initialized_successfully}")
    try:
        data = request.get_json()
        if not data:
            print("[LOGIN_API_FAIL] Requisição sem corpo JSON.")
            return jsonify({"sucesso": False, "erro": "Requisição sem corpo JSON."}), 400

        username_email_input = data.get('username')
        password = data.get('password')

        if not username_email_input or not password:
            print("[LOGIN_API_FAIL] E-mail ou senha não fornecidos.")
            return jsonify({"sucesso": False, "erro": "E-mail e senha são obrigatórios"}), 400

        user = check_user_credentials(username_email_input, password)

        if user:
            print(f"[LOGIN_API_SUCCESS] Login bem-sucedido para {username_email_input} em {time.time() - login_processing_start_time:.4f}s")
            return jsonify({"sucesso": True, "mensagem": "Login bem-sucedido!", "usuario": user}), 200
        else:
            print(f"[LOGIN_API_FAIL] Credenciais inválidas para {username_email_input} em {time.time() - login_processing_start_time:.4f}s")
            return jsonify({"sucesso": False, "erro": "E-mail ou senha inválidos."}), 401 
    except Exception as e:
        print(f"[LOGIN_API_ERROR] Exceção na rota /api/login: {e}")
        traceback.print_exc()
        return jsonify({"sucesso": False, "erro": f"Erro interno no servidor: {str(e)}"}), 500

@app.route('/api/register', methods=['POST'])
@ensure_firebase_initialized # Adicionado para garantir que db esteja pronto
def register_client_user():
    # if not db: return jsonify({"erro": "Sistema indisponível no momento."}), 503 # Redundante com o decorador
    data = request.get_json()
    nome = data.get('nome', '').strip()
    username_email = data.get('username', '').strip().lower() 
    password = data.get('password')
    if not all([nome, username_email, password]):
        return jsonify({"erro": "Nome, e-mail e senha são obrigatórios."}), 400
    if len(password) < 6:
        return jsonify({"erro": "A senha deve ter pelo menos 6 caracteres."}), 400
    if "@" not in username_email or "." not in username_email.split('@')[-1]:
        return jsonify({"erro": "Formato de e-mail inválido."}), 400
    try:
        user_ref = db.collection('usuarios').document(username_email)
        if user_ref.get().exists:
            return jsonify({"erro": "Este e-mail já está cadastrado."}), 409
        new_user_data = {
            'username': username_email, 'password_hash': generate_password_hash(password),
            'role': 'cliente', 'nome': nome, 'status': 'ATIVO', 
            'data_criacao': datetime.now(timezone.utc)
        }
        user_ref.set(new_user_data)
        user_for_response = {"username": username_email, "role": "cliente", "nome": nome}
        return jsonify({"sucesso": True, "mensagem": "Conta criada com sucesso! Você já pode fazer login.", "usuario": user_for_response}), 201
    except Exception as e:
        print(f"ERRO AO REGISTRAR NOVO CLIENTE: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao criar conta: {str(e)}"}), 500

# --- Rotas de API para Livros, Empréstimos, etc. ---
# (O restante das suas rotas /api/... permanece aqui, como no arquivo original)
# Certifique-se de adicionar @ensure_firebase_initialized onde 'db' ou 'bucket' são usados.

@app.route('/api/isbn_lookup', methods=['GET'])
def isbn_lookup():
    isbn = request.args.get('isbn')
    if not isbn:
        return jsonify({"sucesso": False, "erro": "ISBN não fornecido."}), 400
    
    print(f"DEBUG: Iniciando busca por ISBN: {isbn}")
    livro_encontrado_dados = None

    google_books_api_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    print(f"DEBUG: Tentando Google Books API: {google_books_api_url}")
    try:
        response_google = requests.get(google_books_api_url, timeout=7)
        print(f"DEBUG: Google Books API status: {response_google.status_code}")
        if response_google.status_code == 200:
            data_google = response_google.json()
            if data_google.get("totalItems", 0) > 0 and "items" in data_google and len(data_google["items"]) > 0:
                book_item = data_google["items"][0]
                book_info = book_item.get("volumeInfo", {})
                titulo = book_info.get("title")
                autores_lista = book_info.get("authors", [])
                autor_str = ", ".join(autores_lista) if autores_lista else None
                ano_publicacao_str = book_info.get("publishedDate", "")
                ano_publicacao = None
                if ano_publicacao_str:
                    match = re.search(r'\d{4}', ano_publicacao_str)
                    if match: ano_publicacao = match.group(0)
                editora = book_info.get("publisher")
                generos_lista = book_info.get("categories", [])
                generos_str = ", ".join(generos_lista) if generos_lista else None
                capa_url = None
                if book_info.get("imageLinks"):
                    capa_url = book_info["imageLinks"].get("thumbnail") or book_info["imageLinks"].get("smallThumbnail")
                livro_encontrado_dados = {
                    "titulo": titulo, "autores": autor_str, "ano_publicacao": ano_publicacao,
                    "editora": editora, "generos": generos_str, "capa_url": capa_url, "fonte": "Google Books"
                }
                print(f"DEBUG: Informações encontradas para ISBN {isbn} (Google Books)")
        else:
            print(f"DEBUG: Google Books API respondeu com {response_google.status_code} ou sem itens.")
    except requests.exceptions.Timeout:
        print(f"AVISO: Timeout ao contatar Google Books API para ISBN: {isbn}")
    except requests.exceptions.RequestException as e_google: 
        print(f"AVISO: Erro na requisição para Google Books API (ISBN: {isbn}): {type(e_google).__name__} - {e_google}")
    except Exception as e_proc_google:
        print(f"AVISO: Erro ao processar resposta do Google Books (ISBN: {isbn}): {e_proc_google}")

    if not livro_encontrado_dados:
        open_library_api_url = f"https://openlibrary.org/isbn/{isbn}.json"
        print(f"DEBUG: Tentando OpenLibrary API: {open_library_api_url}")
        try:
            response_ol = requests.get(open_library_api_url, timeout=7)
            print(f"DEBUG: OpenLibrary API status: {response_ol.status_code}")
            if response_ol.status_code == 200:
                data_ol = response_ol.json()
                titulo_ol = data_ol.get("title")
                if titulo_ol: 
                    autores_ol_data = data_ol.get("authors", [])
                    autores_ol_lista = [author.get("name") for author in autores_ol_data if isinstance(author, dict) and author.get("name")]
                    autor_ol_str = ", ".join(autores_ol_lista) if autores_ol_lista else None
                    ano_publicacao_ol_str = data_ol.get("publish_date", "")
                    ano_publicacao_ol = None
                    if ano_publicacao_ol_str:
                        match_ol = re.search(r'\d{4}', str(ano_publicacao_ol_str))
                        if match_ol: ano_publicacao_ol = match_ol.group(0)
                    editoras_ol_lista = data_ol.get("publishers", [])
                    editora_ol_str = ", ".join(editoras_ol_lista) if editoras_ol_lista else None
                    capa_ol_url = None
                    covers = data_ol.get("covers")
                    if covers and isinstance(covers, list) and len(covers) > 0:
                        capa_ol_url = f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg"
                    livro_encontrado_dados = {
                        "titulo": titulo_ol, "autores": autor_ol_str, "ano_publicacao": ano_publicacao_ol,
                        "editora": editora_ol_str, "generos": None, 
                        "capa_url": capa_ol_url, "fonte": "OpenLibrary"
                    }
                    print(f"DEBUG: Informações encontradas para ISBN {isbn} (OpenLibrary)")
                else:
                    print(f"DEBUG: ISBN {isbn} encontrado na OpenLibrary, mas sem título.")
            else:
                print(f"DEBUG: ISBN {isbn} não encontrado na OpenLibrary (Status: {response_ol.status_code}).")
        except requests.exceptions.Timeout:
            print(f"AVISO: Timeout ao contatar OpenLibrary API para ISBN: {isbn}")
        except requests.exceptions.RequestException as e_ol:
            print(f"AVISO: Erro na requisição para OpenLibrary API (ISBN: {isbn}): {type(e_ol).__name__} - {e_ol}")
        except Exception as e_proc_ol:
            print(f"AVISO: Erro ao processar resposta da OpenLibrary (ISBN: {isbn}): {e_proc_ol}")

    if livro_encontrado_dados:
        return jsonify({"sucesso": True, "livro": livro_encontrado_dados}), 200
    else:
        print(f"ERRO FINAL: Nenhuma informação encontrada para o ISBN {isbn} em ambas as APIs.")
        return jsonify({"sucesso": False, "erro": f"Nenhuma informação encontrada para o ISBN {isbn}."}), 404

@app.route('/api/livros', methods=['POST'])
@ensure_firebase_initialized
def adicionar_livro():
    try:
        titulo = request.form.get('titulo','').strip()
        autor = request.form.get('autor','').strip()
        isbn = request.form.get('isbn', '').strip()

        if not titulo or not autor: 
            return jsonify({"erro": "Título e Autor são obrigatórios"}), 400
        
        if isbn: 
            livros_existentes_query = db.collection('livros').where('isbn', '==', isbn).limit(1).stream()
            if any(livros_existentes_query):
                return jsonify({"erro": f"Um livro com o ISBN {isbn} já existe."}), 409 
        else: 
            livros_titulo_autor_query = db.collection('livros').where('titulo', '==', titulo).where('autor', '==', autor).limit(1).stream()
            if any(livros_titulo_autor_query):
                return jsonify({"erro": "Um livro com este título e autor (sem ISBN) já existe."}), 409

        capa_url_final = request.form.get('capa_url_manual') 
        if 'capa_file' in request.files:
            capa_file = request.files['capa_file']
            if capa_file.filename != '':
                original_filename, file_extension = os.path.splitext(capa_file.filename)
                unique_filename = f"capas/{uuid.uuid4()}{file_extension}"
                blob = bucket.blob(unique_filename)
                blob.upload_from_file(capa_file, content_type=capa_file.content_type)
                blob.make_public()
                capa_url_final = blob.public_url 
        
        ano_publicacao_str = request.form.get('ano_publicacao')
        ano_publicacao_int = None
        if ano_publicacao_str: 
            try: ano_publicacao_int = int(str(ano_publicacao_str).split('-')[0]) 
            except ValueError: print(f"Valor de ano_publicacao inválido: {ano_publicacao_str}")
        
        numero_exemplares_total = int(request.form.get('numero_exemplares_total', 1))
        numero_exemplares_disponiveis_form = request.form.get('numero_exemplares_disponiveis')
        
        if numero_exemplares_disponiveis_form is not None and numero_exemplares_disponiveis_form != '':
            numero_exemplares_disponiveis = min(int(numero_exemplares_disponiveis_form), numero_exemplares_total)
        else:
            numero_exemplares_disponiveis = numero_exemplares_total

        livro_para_salvar = {
            'titulo': titulo, 'autor': autor, 'isbn': isbn,
            'ano_publicacao': ano_publicacao_int, 
            'genero': request.form.get('genero', '').strip(),
            'editora': request.form.get('editora', '').strip(),
            'numero_exemplares_total': numero_exemplares_total,
            'numero_exemplares_disponiveis': numero_exemplares_disponiveis,
            'capa_url': capa_url_final, 
            'data_cadastro': datetime.now(timezone.utc)
        }
        doc_ref_tuple = db.collection('livros').add(livro_para_salvar)
        id_novo_livro = doc_ref_tuple[1].id
        return jsonify({"mensagem": "Livro adicionado com sucesso!", "id_livro": id_novo_livro, "capa_url": capa_url_final}), 201
    except Exception as e:
        print(f"ERRO AO ADICIONAR LIVRO: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao adicionar livro: {str(e)}"}), 500

@app.route('/api/livros', methods=['GET'])
@ensure_firebase_initialized
def get_livros():
    print("DEBUG: Rota /api/livros (GET com cursor) iniciada")
    try:
        search_term = request.args.get('search', '').lower().strip()
        genre_filter = request.args.get('genre', '').lower().strip()
        limit = int(request.args.get('limit', 12)) 
        start_after_doc_id = request.args.get('start_after_doc_id', None)
        query = db.collection('livros')
        query = query.order_by('titulo', direction=firestore.Query.ASCENDING)

        if start_after_doc_id:
            try:
                last_doc_snapshot = db.collection('livros').document(start_after_doc_id).get()
                if last_doc_snapshot.exists:
                    query = query.start_after(last_doc_snapshot)
                    print(f"DEBUG: Paginação - iniciando após doc ID: {start_after_doc_id}")
                else:
                    print(f"AVISO: Documento cursor '{start_after_doc_id}' não encontrado. Buscando do início.")
            except Exception as e_cursor:
                print(f"ERRO ao processar cursor '{start_after_doc_id}': {e_cursor}. Buscando do início.")
        
        docs_snapshot_list = list(query.limit(limit + 1).stream())
        livros_paginados_temp = []
        for doc in docs_snapshot_list:
            livro_data = doc.to_dict()
            if not isinstance(livro_data, dict): continue
            livro_data['id'] = doc.id
            data_cadastro_obj = livro_data.get('data_cadastro')
            if isinstance(data_cadastro_obj, datetime): 
                livro_data['data_cadastro'] = data_cadastro_obj.isoformat()
            elif data_cadastro_obj is not None:
                 try:
                    if isinstance(data_cadastro_obj, str):
                        parsed_date = datetime.fromisoformat(data_cadastro_obj.replace("Z", "+00:00")) if "T" in data_cadastro_obj else datetime.strptime(data_cadastro_obj, '%Y-%m-%d')
                        livro_data['data_cadastro'] = parsed_date.isoformat()
                    else: 
                        livro_data['data_cadastro'] = str(data_cadastro_obj)
                 except ValueError:
                    livro_data['data_cadastro'] = str(data_cadastro_obj)
            else:
                livro_data['data_cadastro'] = None
            
            passes_genre_filter = True
            if genre_filter:
                generos_do_livro_str = str(livro_data.get('genero', '')).lower()
                if not any(g.strip() == genre_filter for g in generos_do_livro_str.split(',')):
                    passes_genre_filter = False
            
            passes_search_filter = True
            if search_term:
                match_titulo = (str(livro_data.get('titulo', '')).lower().find(search_term) != -1)
                match_autor = (str(livro_data.get('autor', '')).lower().find(search_term) != -1)
                match_isbn = (str(livro_data.get('isbn', '')).lower().find(search_term) != -1)
                if not (match_titulo or match_autor or match_isbn):
                    passes_search_filter = False
            
            if passes_genre_filter and passes_search_filter:
                livros_paginados_temp.append(livro_data)

        has_next_page = len(livros_paginados_temp) > limit
        livros_para_retornar = livros_paginados_temp[:limit] 
        next_page_cursor = None
        if has_next_page and len(livros_para_retornar) > 0:
            next_page_cursor = livros_para_retornar[-1]['id']

        pagination_info = {
            "next_page_cursor": next_page_cursor, "has_next_page": has_next_page,
            "items_on_page": len(livros_para_retornar)
        }
        return jsonify({"livros": livros_para_retornar, "pagination": pagination_info}), 200
    except ValueError as ve: 
        print(f"ERRO ValueError em GET /api/livros: {ve}"); traceback.print_exc()
        return jsonify({"erro": "Parâmetros inválidos."}), 400
    except Exception as e:
        print(f"ERRO CRÍTICO GET /api/livros (com paginação por cursor): {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno crítico ao buscar livros: {str(e)}", "livros": [], "pagination": {}}), 500

@app.route('/api/livros/<livro_id>', methods=['GET'])
@ensure_firebase_initialized
def get_livro_por_id(livro_id):
    try:
        livro_ref = db.collection('livros').document(livro_id)
        livro_doc = livro_ref.get()
        if not livro_doc.exists:
            return jsonify({"erro": "Livro não encontrado."}), 404
        livro_data = livro_doc.to_dict()
        livro_data['id'] = livro_doc.id
        data_cadastro_val = livro_data.get('data_cadastro')
        if isinstance(data_cadastro_val, datetime): 
            livro_data['data_cadastro'] = data_cadastro_val.isoformat()
        elif data_cadastro_val is not None: 
            livro_data['data_cadastro'] = str(data_cadastro_val) 
        return jsonify(livro_data), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR LIVRO POR ID {livro_id}: {e}")
        return jsonify({"erro": f"Erro interno ao buscar livro: {str(e)}"}), 500

@app.route('/api/livros/<livro_id>', methods=['PUT'])
@ensure_firebase_initialized
def update_livro(livro_id):
    try:
        livro_ref = db.collection('livros').document(livro_id)
        livro_doc = livro_ref.get()
        if not livro_doc.exists:
            return jsonify({"erro": "Livro não encontrado para atualização."}), 404

        dados_atuais = livro_doc.to_dict()
        dados_atualizados = {}
        titulo = request.form.get('titulo','').strip()
        autor = request.form.get('autor','').strip()
        isbn = request.form.get('isbn', '').strip()

        if not titulo or not autor: 
            return jsonify({"erro": "Título e Autor são obrigatórios"}), 400
        
        dados_atualizados['titulo'] = titulo
        dados_atualizados['autor'] = autor
        
        if isbn and isbn != dados_atuais.get('isbn'):
            livros_isbn_query = db.collection('livros').where('isbn', '==', isbn).limit(1).stream()
            for doc_existente in livros_isbn_query:
                if doc_existente.id != livro_id: 
                    return jsonify({"erro": f"O novo ISBN {isbn} já está em uso por outro livro."}), 409
        dados_atualizados['isbn'] = isbn

        capa_url_final = request.form.get('capa_url_manual', dados_atuais.get('capa_url')) 
        if 'capa_file' in request.files:
            capa_file = request.files['capa_file']
            if capa_file.filename != '':
                original_filename, file_extension = os.path.splitext(capa_file.filename)
                unique_filename = f"capas/{uuid.uuid4()}{file_extension}"
                blob = bucket.blob(unique_filename)
                blob.upload_from_file(capa_file, content_type=capa_file.content_type)
                blob.make_public()
                capa_url_final = blob.public_url 
        dados_atualizados['capa_url'] = capa_url_final

        ano_publicacao_str = request.form.get('ano_publicacao')
        if ano_publicacao_str:
            try: dados_atualizados['ano_publicacao'] = int(str(ano_publicacao_str).split('-')[0])
            except ValueError: pass 
        else: dados_atualizados['ano_publicacao'] = dados_atuais.get('ano_publicacao')

        dados_atualizados['genero'] = request.form.get('genero', dados_atuais.get('genero', '')).strip()
        dados_atualizados['editora'] = request.form.get('editora', dados_atuais.get('editora', '')).strip()
        
        numero_exemplares_total_form = request.form.get('numero_exemplares_total')
        if numero_exemplares_total_form:
            dados_atualizados['numero_exemplares_total'] = int(numero_exemplares_total_form)
        else:
            dados_atualizados['numero_exemplares_total'] = dados_atuais.get('numero_exemplares_total', 1)

        diferenca_total = dados_atualizados['numero_exemplares_total'] - dados_atuais.get('numero_exemplares_total', 0)
        exemplares_disponiveis_atuais = dados_atuais.get('numero_exemplares_disponiveis', 0)
        novos_disponiveis = exemplares_disponiveis_atuais + diferenca_total
        dados_atualizados['numero_exemplares_disponiveis'] = max(0, novos_disponiveis) 

        livro_ref.update(dados_atualizados)
        return jsonify({"mensagem": "Livro atualizado com sucesso!", "livro_atualizado": dados_atualizados}), 200
    except Exception as e:
        print(f"ERRO AO ATUALIZAR LIVRO {livro_id}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao atualizar livro: {str(e)}"}), 500

@app.route('/api/livros/<livro_id>', methods=['DELETE'])
@ensure_firebase_initialized
def delete_livro(livro_id):
    try:
        livro_ref = db.collection('livros').document(livro_id)
        livro_doc = livro_ref.get()
        if not livro_doc.exists:
            return jsonify({"erro": "Livro não encontrado para exclusão."}), 404

        emprestimos_ativos_query = db.collection('emprestimos').where('livro_id', '==', livro_id).where('status', '==', 'emprestado').limit(1).stream()
        if any(emprestimos_ativos_query):
            return jsonify({"erro": "Este livro possui empréstimos ativos e não pode ser excluído."}), 409 

        livro_data = livro_doc.to_dict()
        capa_url_antiga = livro_data.get('capa_url')
        if capa_url_antiga and "firebasestorage.googleapis.com" in capa_url_antiga:
            try:
                # Extrai o nome do blob da URL pública do Firebase Storage
                # Exemplo de URL: https://firebasestorage.googleapis.com/v0/b/SEU_BUCKET.appspot.com/o/caminho%2Fpara%2Farquivo.jpg?alt=media&token=TOKEN
                if f"{STORAGE_BUCKET_NAME_CONST}/o/" in capa_url_antiga:
                    blob_name_encoded = capa_url_antiga.split(f"{STORAGE_BUCKET_NAME_CONST}/o/")[1].split("?")[0]
                    blob_name = requests.utils.unquote(blob_name_encoded) # Decodifica caracteres como %2F para /
                    
                    blob_to_delete = bucket.blob(blob_name)
                    if blob_to_delete.exists():
                        blob_to_delete.delete()
                        print(f"Capa '{blob_name}' deletada do Storage.")
                    else:
                        print(f"Capa '{blob_name}' não encontrada no Storage para deletar.")
                else:
                    print(f"URL da capa '{capa_url_antiga}' não parece ser uma URL padrão do Firebase Storage para exclusão.")
            except Exception as e_delete_storage:
                print(f"Erro ao tentar deletar capa '{capa_url_antiga}' do Storage: {e_delete_storage}")
        
        livro_ref.delete()
        avaliacoes_query = db.collection('avaliacoes').where('livro_id', '==', livro_id).stream()
        for avaliacao_doc in avaliacoes_query:
            avaliacao_doc.reference.delete()
        return jsonify({"mensagem": "Livro excluído com sucesso!"}), 200
    except Exception as e:
        print(f"ERRO AO EXCLUIR LIVRO {livro_id}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao excluir livro: {str(e)}"}), 500

@app.route('/api/generos', methods=['GET'])
@ensure_firebase_initialized
def get_generos():
    try:
        livros_ref = db.collection('livros').stream()
        generos_set = set()
        for doc in livros_ref:
            livro_data = doc.to_dict()
            genero_str = livro_data.get('genero')
            if genero_str and isinstance(genero_str, str):
                generos_individuais = [g.strip() for g in genero_str.split(',') if g.strip()]
                for g_item in generos_individuais: generos_set.add(g_item) # Corrigido para g_item
        return jsonify(sorted(list(generos_set), key=lambda s: s.lower())), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR GÊNEROS: {e}")
        return jsonify({"erro": "Erro ao buscar gêneros"}), 500

# --- Funções Auxiliares de Serialização ---
def serialize_emprestimo_datas(emprestimo_data):
    if not isinstance(emprestimo_data, dict):
        return emprestimo_data 
    date_keys = ['data_emprestimo', 'data_devolucao_prevista', 'data_devolucao_real', 
                 'multa_data_pagamento', 'multa_data_isencao', 'data_ultima_renovacao']
    for key in date_keys:
        if key in emprestimo_data and isinstance(emprestimo_data[key], datetime):
            if emprestimo_data[key].tzinfo is None:
                emprestimo_data[key] = emprestimo_data[key].replace(tzinfo=timezone.utc)
            else:
                emprestimo_data[key] = emprestimo_data[key].astimezone(timezone.utc)
            emprestimo_data[key] = emprestimo_data[key].isoformat()
    return emprestimo_data

# --- Rotas de Empréstimos ---
@app.route('/api/emprestar_livro', methods=['POST'])
@ensure_firebase_initialized
def emprestar_livro_api():
    try:
        dados_emprestimo = request.get_json()
        livro_id = dados_emprestimo.get('livro_id')
        livro_titulo = dados_emprestimo.get('livro_titulo') 
        leitor_nome = dados_emprestimo.get('leitor_nome') # Nome do leitor (pode ser diferente do username)
        data_devolucao_str = dados_emprestimo.get('data_devolucao')
        cliente_username = dados_emprestimo.get('cliente_username') # Username do cliente logado

        if not all([livro_id, livro_titulo, leitor_nome, data_devolucao_str, cliente_username]):
            return jsonify({"erro": "Dados incompletos para o empréstimo (livro, leitor, data devolução, username cliente)."}), 400
        
        livro_ref = db.collection('livros').document(livro_id)
        
        @firestore.transactional
        def registrar_emprestimo_transaction(transaction, current_livro_ref):
            livro_snapshot = current_livro_ref.get(transaction=transaction) 
            if not livro_snapshot.exists: 
                raise Exception("Livro não encontrado.")
            
            livro_data_trans = livro_snapshot.to_dict()
            exemplares_disponiveis_atuais = livro_data_trans.get('numero_exemplares_disponiveis', 0)

            if exemplares_disponiveis_atuais <= 0: 
                raise Exception("Conflito: Nenhum exemplar disponível.")
            
            transaction.update(current_livro_ref, {'numero_exemplares_disponiveis': exemplares_disponiveis_atuais - 1})

            novo_emprestimo_ref = db.collection('emprestimos').document() 
            transaction.set(novo_emprestimo_ref, {
                'livro_id': livro_id, 'livro_titulo': livro_titulo, 'leitor_nome': leitor_nome,
                'cliente_username': cliente_username.lower(), # Armazena em minúsculas para consistência
                'data_emprestimo': datetime.now(timezone.utc),
                'data_devolucao_prevista': datetime.strptime(data_devolucao_str, '%Y-%m-%d').replace(tzinfo=timezone.utc),
                'data_devolucao_real': None, 'status': 'emprestado', 'vezes_renovado': 0 
            })
            return novo_emprestimo_ref.id
        
        transaction_obj = db.transaction() 
        id_novo_emprestimo = registrar_emprestimo_transaction(transaction_obj, livro_ref)
        
        return jsonify({"mensagem": "Empréstimo registrado com sucesso!", "id_emprestimo": id_novo_emprestimo}), 201
    except Exception as e:
        print(f"ERRO AO REGISTRAR EMPRÉSTIMO: {e}"); 
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao registrar empréstimo: {str(e)}"}), 500

@app.route('/api/emprestimos/<id_emprestimo>/renovar', methods=['POST'])
@ensure_firebase_initialized
def renovar_emprestimo(id_emprestimo):
    try:
        emprestimo_ref = db.collection('emprestimos').document(id_emprestimo)
        emprestimo_doc = emprestimo_ref.get()
        if not emprestimo_doc.exists:
            return jsonify({"erro": "Empréstimo não encontrado."}), 404

        emprestimo_data = emprestimo_doc.to_dict()
        if emprestimo_data.get('status') != 'emprestado':
            return jsonify({"erro": "Apenas empréstimos com status 'emprestado' podem ser renovados."}), 400
        
        MAX_RENOVACOES = 2 
        vezes_renovado_atual = emprestimo_data.get('vezes_renovado', 0)
        if vezes_renovado_atual >= MAX_RENOVACOES:
             return jsonify({"erro": f"Este empréstimo já atingiu o limite máximo de {MAX_RENOVACOES} renovações."}), 400

        data_devolucao_atual_obj = emprestimo_data.get('data_devolucao_prevista')
        if not data_devolucao_atual_obj:
             return jsonify({"erro": "Data de devolução atual não encontrada para este empréstimo."}), 500

        if isinstance(data_devolucao_atual_obj, str):
            data_devolucao_atual = datetime.fromisoformat(data_devolucao_atual_obj.replace('Z', '+00:00'))
        elif isinstance(data_devolucao_atual_obj, datetime):
            data_devolucao_atual = data_devolucao_atual_obj
        else: # Assume ser um Timestamp do Firebase se não for str nem datetime Python
             data_devolucao_atual = data_devolucao_atual_obj.to_datetime().replace(tzinfo=timezone.utc)
            
        nova_data_devolucao = data_devolucao_atual + timedelta(days=7) 
        vezes_renovado_novo = vezes_renovado_atual + 1

        emprestimo_ref.update({
            'data_devolucao_prevista': nova_data_devolucao,
            'vezes_renovado': vezes_renovado_novo,
            'data_ultima_renovacao': datetime.now(timezone.utc) 
        })
        return jsonify({
            "sucesso": True, "mensagem": "Empréstimo renovado com sucesso!",
            "nova_data_devolucao_prevista": nova_data_devolucao.isoformat(),
            "vezes_renovado": vezes_renovado_novo
        }), 200
    except Exception as e:
        print(f"ERRO AO RENOVAR EMPRÉSTIMO {id_emprestimo}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao renovar empréstimo: {str(e)}"}), 500

@app.route('/api/meus_emprestimos', methods=['GET'])
@ensure_firebase_initialized
def get_meus_emprestimos_api():
    cliente_username_param = request.args.get('username')
    if not cliente_username_param: return jsonify({"erro": "Nome de usuário do cliente não fornecido."}), 400
    cliente_username_lower = cliente_username_param.lower()
    try:
        query = db.collection('emprestimos').where('cliente_username', '==', cliente_username_lower).where('status', 'in', ['emprestado', 'atrasado']).order_by('data_devolucao_prevista', direction=firestore.Query.ASCENDING)
        docs = query.stream()
        lista_emprestimos = []
        for doc_emprestimo in docs:
            emprestimo_data = doc_emprestimo.to_dict()
            emprestimo_data['id_emprestimo'] = doc_emprestimo.id
            leitor_info = get_user_from_firestore(emprestimo_data.get('cliente_username'))
            emprestimo_data['leitor_nome_completo'] = leitor_info.get('nome') if leitor_info else emprestimo_data.get('cliente_username')
            livro_id = emprestimo_data.get('livro_id')
            if livro_id:
                livro_doc = db.collection('livros').document(livro_id).get()
                if livro_doc.exists: emprestimo_data['livro_detalhes'] = livro_doc.to_dict()
            emprestimo_data = serialize_emprestimo_datas(emprestimo_data)
            lista_emprestimos.append(emprestimo_data)
        return jsonify(lista_emprestimos), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR MEUS EMPRÉSTIMOS para {cliente_username_lower}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao buscar seus empréstimos: {str(e)}"}), 500

@app.route('/api/historico_emprestimos', methods=['GET'])
@ensure_firebase_initialized
def get_historico_emprestimos(): 
    cliente_username_param = request.args.get('username')
    if not cliente_username_param:
        return jsonify({"erro": "Nome de usuário do cliente não fornecido."}), 400
    cliente_username_lower = cliente_username_param.lower()
    try:
        emprestimos_ref = db.collection('emprestimos')
        query = emprestimos_ref.where('cliente_username', '==', cliente_username_lower).order_by('data_emprestimo', direction=firestore.Query.DESCENDING)
        docs = query.stream()
        historico_emprestimos_lista = [] 
        for doc_emprestimo in docs:
            emprestimo_data = doc_emprestimo.to_dict()
            emprestimo_data['id_emprestimo'] = doc_emprestimo.id 
            leitor_info = get_user_from_firestore(emprestimo_data.get('cliente_username'))
            emprestimo_data['leitor_nome_completo'] = leitor_info.get('nome') if leitor_info else emprestimo_data.get('cliente_username')
            livro_id = emprestimo_data.get('livro_id')
            livro_detalhes = {} 
            if livro_id:
                livro_doc_ref = db.collection('livros').document(livro_id)
                livro_doc = livro_doc_ref.get()
                if livro_doc.exists:
                    livro_info_db = livro_doc.to_dict()
                    livro_detalhes['capa_url'] = livro_info_db.get('capa_url')
                    livro_detalhes['autor'] = livro_info_db.get('autor') 
            emprestimo_data['livro_detalhes'] = livro_detalhes 
            emprestimo_data = serialize_emprestimo_datas(emprestimo_data)
            historico_emprestimos_lista.append(emprestimo_data)
        return jsonify(historico_emprestimos_lista), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR HISTÓRICO DE EMPRÉSTIMOS para {cliente_username_lower}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao buscar seu histórico: {str(e)}"}), 500

@app.route('/api/admin/emprestimos', methods=['GET'])
@ensure_firebase_initialized
def get_admin_todos_emprestimos_api():
    try:
        query = db.collection('emprestimos').order_by('data_emprestimo', direction=firestore.Query.DESCENDING)
        docs = query.stream()
        lista_emprestimos = []
        for doc_emprestimo in docs:
            emprestimo_data = doc_emprestimo.to_dict()
            emprestimo_data['id_emprestimo'] = doc_emprestimo.id
            cliente_username = emprestimo_data.get('cliente_username')
            if cliente_username:
                 leitor_info = get_user_from_firestore(cliente_username)
                 emprestimo_data['leitor_nome_completo'] = emprestimo_data.get('leitor_nome') or (leitor_info.get('nome') if leitor_info else cliente_username)
            else:
                emprestimo_data['leitor_nome_completo'] = emprestimo_data.get('leitor_nome', 'Desconhecido')
            livro_id = emprestimo_data.get('livro_id')
            if livro_id:
                livro_doc = db.collection('livros').document(livro_id).get()
                if livro_doc.exists: emprestimo_data['livro_detalhes'] = livro_doc.to_dict()
            emprestimo_data = serialize_emprestimo_datas(emprestimo_data) 
            lista_emprestimos.append(emprestimo_data)
        return jsonify(lista_emprestimos), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR TODOS OS EMPRÉSTIMOS (ADMIN): {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao buscar empréstimos: {str(e)}"}), 500

@app.route('/api/registrar_devolucao', methods=['POST'])
@ensure_firebase_initialized
def registrar_devolucao_api():
    try:
        data = request.get_json()
        id_emprestimo = data.get('id_emprestimo')
        if not id_emprestimo: return jsonify({"erro": "ID do empréstimo não fornecido."}), 400
        emprestimo_ref = db.collection('emprestimos').document(id_emprestimo)
        
        @firestore.transactional
        def registrar_devolucao_transaction(transaction, current_emprestimo_ref):
            emprestimo_snapshot = current_emprestimo_ref.get(transaction=transaction)
            if not emprestimo_snapshot.exists: 
                raise Exception("Empréstimo não encontrado.")
            
            emprestimo_data = emprestimo_snapshot.to_dict()
            if emprestimo_data.get('status') == 'devolvido': 
                raise Exception("Este livro já foi devolvido.")

            livro_id = emprestimo_data.get('livro_id')
            if not livro_id: 
                raise Exception("ID do livro não encontrado no registro de empréstimo.")

            livro_ref_trans = db.collection('livros').document(livro_id)
            livro_snapshot_trans = livro_ref_trans.get(transaction=transaction)
            if livro_snapshot_trans.exists:
                exemplares_disponiveis_atuais = livro_snapshot_trans.to_dict().get('numero_exemplares_disponiveis', 0)
                transaction.update(livro_ref_trans, {'numero_exemplares_disponiveis': exemplares_disponiveis_atuais + 1})
            else:
                print(f"AVISO: Livro ID {livro_id} não encontrado para atualização de exemplares na devolução do empréstimo {id_emprestimo}.")

            data_devolucao_real = datetime.now(timezone.utc)
            data_devolucao_prevista_obj = emprestimo_data.get('data_devolucao_prevista')
            updates_emprestimo = {
                'status': 'devolvido', 'data_devolucao_real': data_devolucao_real,
                'multa_valor_calculado': 0.0, 'multa_status': 'nao_aplicavel', 'dias_atraso': 0
            }
            if isinstance(data_devolucao_prevista_obj, datetime):
                data_prevista_date = data_devolucao_prevista_obj.date()
                data_real_date = data_devolucao_real.date()
                dias_atraso = (data_real_date - data_prevista_date).days
                if dias_atraso > 0:
                    updates_emprestimo['dias_atraso'] = dias_atraso
                    updates_emprestimo['multa_valor_calculado'] = round(dias_atraso * VALOR_MULTA_POR_DIA, 2)
                    updates_emprestimo['multa_status'] = 'pendente'
                else:
                    updates_emprestimo['dias_atraso'] = 0 
            else:
                print(f"AVISO: Data de devolução prevista para empréstimo {id_emprestimo} não é um objeto datetime válido.")
            transaction.update(current_emprestimo_ref, updates_emprestimo)
            return updates_emprestimo 

        transaction_obj = db.transaction()
        dados_multa = registrar_devolucao_transaction(transaction_obj, emprestimo_ref)
        mensagem_retorno = "Devolução registrada com sucesso!"
        if dados_multa.get('multa_status') == 'pendente':
            mensagem_retorno += f" Multa de R$ {dados_multa.get('multa_valor_calculado'):.2f} gerada por {dados_multa.get('dias_atraso')} dia(s) de atraso."
        return jsonify({"mensagem": mensagem_retorno, "detalhes_multa": dados_multa}), 200
    except Exception as e:
        print(f"ERRO AO REGISTRAR DEVOLUÇÃO para empréstimo {id_emprestimo if 'id_emprestimo' in locals() else 'desconhecido'}: {e}"); 
        traceback.print_exc()
        if str(e) in ["Empréstimo não encontrado.", "Este livro já foi devolvido.", "ID do livro não encontrado no registro de empréstimo."]:
            return jsonify({"erro": str(e)}), 400 
        return jsonify({"erro": f"Erro interno ao registrar devolução: {str(e)}"}), 500

# --- Rotas de Wishlist, Avaliações, Usuários Admin, Relatórios, Sugestões ---
# (Estas rotas devem ser revisadas para usar @ensure_firebase_initialized se acessam 'db' ou 'bucket')

@app.route('/api/wishlist/add', methods=['POST'])
@ensure_firebase_initialized
def add_to_wishlist():
    data = request.get_json()
    username = data.get('username')
    livro_id = data.get('livro_id')
    if not username or not livro_id:
        return jsonify({"erro": "Nome de usuário e ID do livro são obrigatórios."}), 400
    try:
        wishlist_ref = db.collection('listas_desejo').document(username)
        wishlist_doc = wishlist_ref.get()
        if wishlist_doc.exists:
            wishlist_ref.update({'livros_ids': firestore.ArrayUnion([livro_id]), 'ultima_atualizacao': firestore.SERVER_TIMESTAMP})
        else:
            wishlist_ref.set({'username': username, 'livros_ids': [livro_id], 'data_criacao': firestore.SERVER_TIMESTAMP, 'ultima_atualizacao': firestore.SERVER_TIMESTAMP})
        return jsonify({"sucesso": True, "mensagem": "Livro adicionado à lista de desejos!"}), 200
    except Exception as e:
        print(f"Erro ao adicionar à lista de desejos para {username}: {e}")
        return jsonify({"erro": "Erro ao adicionar à lista de desejos."}), 500

@app.route('/api/wishlist/remove', methods=['POST'])
@ensure_firebase_initialized
def remove_from_wishlist():
    data = request.get_json()
    username = data.get('username')
    livro_id = data.get('livro_id')
    if not username or not livro_id:
        return jsonify({"erro": "Nome de usuário e ID do livro são obrigatórios."}), 400
    try:
        wishlist_ref = db.collection('listas_desejo').document(username)
        wishlist_ref.update({'livros_ids': firestore.ArrayRemove([livro_id]), 'ultima_atualizacao': firestore.SERVER_TIMESTAMP})
        return jsonify({"sucesso": True, "mensagem": "Livro removido da lista de desejos."}), 200
    except Exception as e:
        print(f"Erro ao remover da lista de desejos para {username}: {e}")
        return jsonify({"erro": "Erro ao remover da lista de desejos."}), 500

@app.route('/api/wishlist', methods=['GET'])
@ensure_firebase_initialized
def get_wishlist():
    username = request.args.get('username')
    if not username:
        return jsonify({"erro": "Nome de usuário não fornecido."}), 400
    try:
        wishlist_ref = db.collection('listas_desejo').document(username)
        wishlist_doc = wishlist_ref.get()
        livros_da_wishlist = []
        if wishlist_doc.exists:
            wishlist_data = wishlist_doc.to_dict()
            livro_ids = wishlist_data.get('livros_ids', [])
            for livro_id in livro_ids:
                livro_doc_ref = db.collection('livros').document(livro_id)
                livro_doc = livro_doc_ref.get()
                if livro_doc.exists:
                    livro_data = livro_doc.to_dict()
                    livro_data['id'] = livro_doc.id 
                    data_cadastro_val = livro_data.get('data_cadastro')
                    if isinstance(data_cadastro_val, datetime): 
                        livro_data['data_cadastro'] = data_cadastro_val.isoformat()
                    elif data_cadastro_val is not None: 
                        livro_data['data_cadastro'] = str(data_cadastro_val)
                    livros_da_wishlist.append(livro_data)
        return jsonify(livros_da_wishlist), 200
    except Exception as e:
        print(f"Erro ao buscar lista de desejos para {username}: {e}")
        return jsonify({"erro": "Erro ao buscar lista de desejos."}), 500

@app.route('/api/livros/<livro_id>/avaliacoes', methods=['POST'])
@ensure_firebase_initialized
def adicionar_avaliacao(livro_id):
    data = request.get_json()
    if not data: return jsonify({"erro": "Dados da avaliação não fornecidos."}), 400
    cliente_username = data.get('cliente_username') 
    nota = data.get('nota')
    comentario = data.get('comentario', '').strip()
    if not cliente_username: return jsonify({"erro": "Usuário não autenticado ou nome de usuário não fornecido."}), 401
    if not livro_id: return jsonify({"erro": "ID do livro não fornecido."}), 400
    try:
        nota_int = int(nota)
        if not (1 <= nota_int <= 5): raise ValueError("Nota fora do intervalo.")
    except (ValueError, TypeError):
        return jsonify({"erro": "A nota deve ser um número inteiro entre 1 e 5."}), 400
    try:
        livro_ref = db.collection('livros').document(livro_id)
        livro_doc = livro_ref.get()
        if not livro_doc.exists: return jsonify({"erro": "Livro não encontrado."}), 404
        nova_avaliacao = {
            'livro_id': livro_id, 'cliente_username': cliente_username,
            'nota': nota_int, 'comentario': comentario, 'data_avaliacao': datetime.now(timezone.utc)
        }
        update_time, avaliacao_ref = db.collection('avaliacoes').add(nova_avaliacao)
        return jsonify({"sucesso": True, "mensagem": "Avaliação adicionada com sucesso!", "id_avaliacao": avaliacao_ref.id}), 201
    except Exception as e:
        print(f"ERRO AO ADICIONAR AVALIAÇÃO para o livro {livro_id}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao adicionar avaliação: {str(e)}"}), 500

@app.route('/api/livros/<livro_id>/avaliacoes', methods=['GET'])
@ensure_firebase_initialized
def get_avaliacoes_livro(livro_id):
    if not livro_id: return jsonify({"erro": "ID do livro não fornecido."}), 400
    try:
        avaliacoes_ref = db.collection('avaliacoes').where('livro_id', '==', livro_id).order_by('data_avaliacao', direction=firestore.Query.DESCENDING)
        docs = avaliacoes_ref.stream()
        lista_avaliacoes = []
        for doc in docs:
            avaliacao_data = doc.to_dict()
            avaliacao_data['id_avaliacao'] = doc.id 
            if isinstance(avaliacao_data.get('data_avaliacao'), datetime):
                avaliacao_data['data_avaliacao'] = avaliacao_data['data_avaliacao'].isoformat()
            elif avaliacao_data.get('data_avaliacao') is not None: 
                avaliacao_data['data_avaliacao'] = str(avaliacao_data['data_avaliacao'])
            lista_avaliacoes.append(avaliacao_data)
        return jsonify(lista_avaliacoes), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR AVALIAÇÕES para o livro {livro_id}: {e}"); traceback.print_exc() 
        return jsonify({"erro": f"Erro ao buscar avaliações: {str(e)}. Verifique o console do servidor para mais detalhes."}), 500

@app.route('/api/admin/usuarios', methods=['GET'])
@ensure_firebase_initialized
def get_all_users():
    try:
        users_stream = db.collection('usuarios').stream(); lista = []
        for user_doc in users_stream:
            data = user_doc.to_dict()
            if 'password_hash' in data: del data['password_hash']
            data['id'] = user_doc.id
            lista.append(data)
        return jsonify(lista), 200
    except Exception as e: print(f"ERRO LISTAR USUÁRIOS: {e}");traceback.print_exc(); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/usuarios', methods=['POST'])
@ensure_firebase_initialized
def create_user():
    data = request.get_json()
    username_email = data.get('username', '').strip().lower()
    password = data.get('password')
    role = data.get('role')
    nome = data.get('nome', '').strip()
    if not all([username_email, password, role, nome]): return jsonify({"erro": "Dados incompletos (nome, e-mail, senha, papel)."}), 400
    if role not in ALL_USER_ROLES: 
        return jsonify({"erro": f"Papel inválido. Permitidos: {', '.join(ALL_USER_ROLES)}."}), 400
    try:
        user_ref = db.collection('usuarios').document(username_email)
        if user_ref.get().exists: return jsonify({"erro": f"Usuário com e-mail {username_email} já existe."}), 409
        new_user_data = {
            'username': username_email, 'password_hash': generate_password_hash(password), 
            'role': role, 'nome': nome, 'status': 'ATIVO', 
            'data_criacao': datetime.now(timezone.utc)
        }
        user_ref.set(new_user_data)
        del new_user_data['password_hash']; new_user_data['id'] = username_email
        return jsonify({"mensagem": "Usuário criado com sucesso!", "usuario": new_user_data}), 201
    except Exception as e: print(f"ERRO CRIAR USUÁRIO: {e}"); traceback.print_exc(); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/usuarios/<user_id>', methods=['PUT'])
@ensure_firebase_initialized
def update_user(user_id):
    data = request.get_json(); updates = {}
    if 'nome' in data and data['nome'].strip(): updates['nome'] = data['nome'].strip()
    new_role = data.get('role')
    if new_role:
        if new_role not in ALL_USER_ROLES: return jsonify({"erro": f"Papel inválido. Permitidos: {', '.join(ALL_USER_ROLES)}."}), 400
        updates['role'] = new_role
    if 'status' in data and data['status'] in ['ATIVO', 'INATIVO']:
        updates['status'] = data['status']
    if not updates: return jsonify({"erro": "Nenhum dado para atualizar."}), 400
    try:
        user_ref = db.collection('usuarios').document(user_id)
        if not user_ref.get().exists: return jsonify({"erro": "Usuário não encontrado."}), 404
        user_ref.update(updates)
        return jsonify({"mensagem": f"Usuário {user_id} atualizado."}), 200
    except Exception as e: print(f"ERRO UPDATE USUÁRIO {user_id}: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/usuarios/<user_id>', methods=['DELETE']) 
@ensure_firebase_initialized
def delete_user(user_id):
    try:
        user_ref = db.collection('usuarios').document(user_id)
        if not user_ref.get().exists: return jsonify({"erro": "Usuário não encontrado."}), 404
        user_ref.update({'status': 'INATIVO'}) 
        return jsonify({"mensagem": f"Usuário {user_id} desativado."}), 200
    except Exception as e: print(f"ERRO DESATIVAR USUÁRIO {user_id}: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/usuarios/<user_id>/resetar-senha', methods=['POST'])
@ensure_firebase_initialized
def reset_user_password(user_id):
    data = request.get_json(); new_password = data.get('password')
    if not new_password or len(new_password) < 6: return jsonify({"erro": "Nova senha obrigatória (mín. 6 caracteres)."}), 400
    try:
        user_ref = db.collection('usuarios').document(user_id)
        if not user_ref.get().exists: return jsonify({"erro": "Usuário não encontrado."}), 404
        user_ref.update({'password_hash': generate_password_hash(new_password)})
        return jsonify({"mensagem": f"Senha de {user_id} redefinida."}), 200
    except Exception as e: print(f"ERRO RESET SENHA {user_id}: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/relatorios/livros-mais-emprestados', methods=['GET'])
@ensure_firebase_initialized
def get_livros_mais_emprestados_api(): 
    try:
        contagem = Counter()
        for emp_doc in db.collection('emprestimos').stream():
            livro_id = emp_doc.to_dict().get('livro_id')
            if livro_id: contagem[livro_id] += 1
        resultado = []
        for livro_id, num in contagem.most_common(10):
            livro_d = db.collection('livros').document(livro_id).get()
            titulo = f"ID {livro_id} (Não Encontrado)"
            if livro_d.exists: titulo = livro_d.to_dict().get('titulo', 'Desconhecido')
            resultado.append({"titulo": titulo, "id_livro": livro_id, "emprestimos": num})
        return jsonify(resultado), 200
    except Exception as e: print(f"ERRO RELATÓRIO MAIS EMPRESTADOS: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/relatorios/generos-mais-populares', methods=['GET'])
@ensure_firebase_initialized
def get_generos_mais_populares_api(): 
    try:
        contagem_g = Counter(); livros_cache = {}
        for emp_doc in db.collection('emprestimos').stream():
            livro_id = emp_doc.to_dict().get('livro_id')
            if livro_id:
                if livro_id not in livros_cache:
                    livro_d = db.collection('livros').document(livro_id).get()
                    livros_cache[livro_id] = livro_d.to_dict().get('genero', '') if livro_d.exists else ''
                generos_str = livros_cache[livro_id]
                if generos_str:
                    for g_item in [gen.strip().capitalize() for gen in generos_str.split(',') if gen.strip()]: contagem_g[g_item] += 1 # Corrigido para g_item
        populares = [{"genero": g, "emprestimos": c} for g, c in contagem_g.most_common(10)]
        return jsonify(populares), 200
    except Exception as e: print(f"ERRO RELATÓRIO GÊNEROS: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/relatorios/emprestimos-por-periodo', methods=['GET'])
@ensure_firebase_initialized
def get_emprestimos_por_periodo_api(): 
    dias = int(request.args.get('dias', 30))
    inicio = datetime.now(timezone.utc) - timedelta(days=dias)
    try:
        query = db.collection('emprestimos').where('data_emprestimo', '>=', inicio).order_by('data_emprestimo').stream()
        contagem_dia = defaultdict(int)
        for emp_doc in query:
            data_e = emp_doc.to_dict().get('data_emprestimo')
            if isinstance(data_e, datetime): contagem_dia[data_e.strftime('%Y-%m-%d')] += 1
        formatado = [{"dia": d, "emprestimos": c} for d, c in sorted(contagem_dia.items())]
        return jsonify(formatado), 200
    except Exception as e: print(f"ERRO RELATÓRIO PERÍODO: {e}"); return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

@app.route('/api/admin/relatorios/emprestimos-atrasados', methods=['GET'])
@ensure_firebase_initialized
def get_emprestimos_atrasados_api():
    print("DEBUG: Rota /api/admin/relatorios/emprestimos-atrasados chamada")
    try:
        hoje_inicio_dia_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        print(f"DEBUG: Data de hoje (UTC, início do dia) para comparação de atraso: {hoje_inicio_dia_utc.isoformat()}")
        query = db.collection('emprestimos').where('status', '==', 'emprestado').where('data_devolucao_prevista', '<', hoje_inicio_dia_utc) 
        try:
            query = query.order_by('data_devolucao_prevista', direction=firestore.Query.ASCENDING)
            docs_snapshot = query.stream()
        except Exception as e_order:
            print(f"AVISO: Falha ao ordenar empréstimos atrasados (pode precisar de índice): {e_order}. Tentando sem ordenação explícita.")
            query_sem_ordem = db.collection('emprestimos').where('status', '==', 'emprestado').where('data_devolucao_prevista', '<', hoje_inicio_dia_utc)
            docs_snapshot = query_sem_ordem.stream()

        atrasados = []
        count_processados = 0
        for doc in docs_snapshot:
            count_processados +=1
            emprestimo_data = doc.to_dict()
            emprestimo_data['id_emprestimo'] = doc.id
            data_dev_prevista_obj = emprestimo_data.get('data_devolucao_prevista')
            dias_atr = 0
            if isinstance(data_dev_prevista_obj, datetime):
                if data_dev_prevista_obj.tzinfo is None:
                    data_dev_prevista_utc = data_dev_prevista_obj.replace(tzinfo=timezone.utc)
                else:
                    data_dev_prevista_utc = data_dev_prevista_obj.astimezone(timezone.utc)
                data_dev_prevista_norm_utc = data_dev_prevista_utc.replace(hour=0, minute=0, second=0, microsecond=0)
                if data_dev_prevista_norm_utc < hoje_inicio_dia_utc:
                    dias_atr = (hoje_inicio_dia_utc - data_dev_prevista_norm_utc).days
                emprestimo_data['dias_atraso'] = max(0, dias_atr)
            else:
                emprestimo_data['dias_atraso'] = 0 
                print(f"AVISO: data_devolucao_prevista não é datetime para empréstimo {doc.id}: {data_dev_prevista_obj}")
            
            cliente_username = emprestimo_data.get('cliente_username')
            if cliente_username:
                 leitor_info = get_user_from_firestore(cliente_username)
                 emprestimo_data['leitor_nome_completo'] = leitor_info.get('nome') if leitor_info else emprestimo_data.get('leitor_nome', cliente_username)
            else:
                emprestimo_data['leitor_nome_completo'] = emprestimo_data.get('leitor_nome', 'Desconhecido')
            emprestimo_data = serialize_emprestimo_datas(emprestimo_data)
            atrasados.append(emprestimo_data)
        
        print(f"DEBUG: Total de documentos processados pela query de atrasados: {count_processados}")
        print(f"DEBUG: Lista final de atrasados (após processamento): {len(atrasados)}")
        return jsonify(atrasados), 200
    except Exception as e:
        print(f"ERRO CRÍTICO em /api/admin/relatorios/emprestimos-atrasados: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno crítico ao buscar empréstimos atrasados: {str(e)}"}), 500

def criar_usuarios_firestore_exemplo():
    if not db: print("Firestore não disponível."); return
    print("Verificando/Criando usuários de exemplo no Firestore...")
    for username_email, dados_usuario in USUARIOS_EXEMPLO.items():
        try:
            username_lower = username_email.lower() 
            user_ref = db.collection('usuarios').document(username_lower)
            dados_para_salvar = {
                'username': username_lower, 
                'password_hash': dados_usuario["password_hash"], 
                'role': dados_usuario["role"], 'nome': dados_usuario["nome"], 
                'status': dados_usuario.get("status", "ATIVO"), 
            }
            user_doc_snapshot = user_ref.get()
            if not user_doc_snapshot.exists: 
                dados_para_salvar['data_criacao'] = datetime.now(timezone.utc)
            user_ref.set(dados_para_salvar, merge=True) 
            print(f"Usuário '{username_lower}' ({dados_usuario['role']}) processado/atualizado.")
        except Exception as e: print(f"Erro ao processar usuário '{username_email}': {e}")

@app.route('/api/sugestoes', methods=['POST'])
@ensure_firebase_initialized
def adicionar_sugestao():
    data = request.get_json()
    titulo = data.get('titulo_sugerido', '').strip()
    autor = data.get('autor_sugerido', '').strip()
    sugerido_por_username = data.get('sugerido_por_username', '').strip().lower() 
    sugerido_por_nome = data.get('sugerido_por_nome', '').strip()
    if not all([titulo, autor, sugerido_por_username, sugerido_por_nome]):
        return jsonify({"erro": "Título, Autor e informações do solicitante são obrigatórios."}), 400
    try:
        nova_sugestao_data = {
            'titulo_sugerido': titulo, 'autor_sugerido': autor,
            'isbn_sugerido': data.get('isbn_sugerido', '').strip() or None,
            'observacao_cliente': data.get('observacao_cliente', '').strip() or None,
            'sugerido_por_username': sugerido_por_username,
            'sugerido_por_nome': sugerido_por_nome,
            'data_sugestao': datetime.now(timezone.utc),
            'status_sugestao': 'pendente', 'admin_feedback': None, 'data_status_alterado': None
        }
        sugestao_ref = db.collection('sugestoes_aquisicao').document()
        sugestao_ref.set(nova_sugestao_data)
        return jsonify({"sucesso": True, "mensagem": "Sugestão enviada com sucesso!", "id_sugestao": sugestao_ref.id}), 201
    except Exception as e:
        print(f"ERRO AO ADICIONAR SUGESTÃO: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao processar sugestão: {str(e)}"}), 500

@app.route('/api/sugestoes/minhas', methods=['GET'])
@ensure_firebase_initialized
def get_minhas_sugestoes():
    username = request.args.get('username')
    if not username: return jsonify({"erro": "Username do cliente não fornecido."}), 400
    try:
        username_lower = username.lower()
        sugestoes_query = db.collection('sugestoes_aquisicao').where('sugerido_por_username', '==', username_lower).order_by('data_sugestao', direction=firestore.Query.DESCENDING).stream()
        lista_sugestoes = []
        for doc in sugestoes_query:
            sugestao_data = doc.to_dict()
            sugestao_data['id_sugestao'] = doc.id
            if isinstance(sugestao_data.get('data_sugestao'), datetime):
                sugestao_data['data_sugestao'] = sugestao_data['data_sugestao'].isoformat()
            if isinstance(sugestao_data.get('data_status_alterado'), datetime):
                sugestao_data['data_status_alterado'] = sugestao_data['data_status_alterado'].isoformat()
            lista_sugestoes.append(sugestao_data)
        return jsonify(lista_sugestoes), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR MINHAS SUGESTÕES para {username}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao buscar sugestões: {str(e)}"}), 500

@app.route('/api/admin/sugestoes', methods=['GET'])
@ensure_firebase_initialized
def get_todas_sugestoes_admin():
    try:
        sugestoes_query = db.collection('sugestoes_aquisicao').order_by('data_sugestao', direction=firestore.Query.DESCENDING).stream()
        lista_sugestoes = []
        for doc in sugestoes_query:
            sugestao_data = doc.to_dict()
            sugestao_data['id_sugestao'] = doc.id
            if isinstance(sugestao_data.get('data_sugestao'), datetime):
                sugestao_data['data_sugestao'] = sugestao_data['data_sugestao'].isoformat()
            if isinstance(sugestao_data.get('data_status_alterado'), datetime):
                sugestao_data['data_status_alterado'] = sugestao_data['data_status_alterado'].isoformat()
            lista_sugestoes.append(sugestao_data)
        return jsonify(lista_sugestoes), 200
    except Exception as e:
        print(f"ERRO AO BUSCAR TODAS AS SUGESTÕES (ADMIN): {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao buscar sugestões: {str(e)}"}), 500

@app.route('/api/admin/sugestoes/<id_sugestao>/status', methods=['PUT'])
@ensure_firebase_initialized
def update_status_sugestao_admin(id_sugestao):
    data = request.get_json()
    novo_status = data.get('status_sugestao')
    admin_feedback = data.get('admin_feedback', None)
    if not novo_status or novo_status not in ['pendente', 'aprovada', 'rejeitada', 'adquirido']:
        return jsonify({"erro": "Status inválido fornecido."}), 400
    try:
        sugestao_ref = db.collection('sugestoes_aquisicao').document(id_sugestao)
        if not sugestao_ref.get().exists:
            return jsonify({"erro": "Sugestão não encontrada."}), 404
        updates = {
            'status_sugestao': novo_status,
            'data_status_alterado': datetime.now(timezone.utc)
        }
        if admin_feedback is not None: 
            updates['admin_feedback'] = admin_feedback.strip() if admin_feedback else None
        sugestao_ref.update(updates)
        return jsonify({"sucesso": True, "mensagem": f"Status da sugestão '{id_sugestao}' atualizado para '{novo_status}'."}), 200
    except Exception as e:
        print(f"ERRO AO ATUALIZAR STATUS DA SUGESTÃO {id_sugestao}: {e}"); traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao atualizar status: {str(e)}"}), 500

# --- Bloco de Execução Principal ---
if __name__ == '__main__':
    # A inicialização do Firebase é crucial.
    # O decorador @ensure_firebase_initialized tentará inicializar se necessário antes de cada rota protegida.
    # Para desenvolvimento local, podemos tentar uma inicialização antecipada aqui.
    # Para o Render, a inicialização ocorrerá na primeira chamada de API que usa o decorador,
    # ou se você tiver uma variável de ambiente FIREBASE_CREDENTIALS_JSON configurada, ela será tentada primeiro.
    
    print("[MAIN_EXECUTION_BLOCK] Verificando se o Firebase deve ser inicializado no startup...")
    # Tenta inicializar se não estiver em um ambiente que define GOOGLE_CLOUD_PROJECT (como o Render sem essa var)
    # E se FIREBASE_CREDENTIALS_JSON não estiver definida (pois se estiver, initialize_firebase já tentou)
    if not os.environ.get("GOOGLE_CLOUD_PROJECT") and not os.environ.get("FIREBASE_CREDENTIALS_JSON"):
        print("[MAIN_LOCAL_DEV] Tentando inicializar Firebase para desenvolvimento local (sem GOOGLE_CLOUD_PROJECT ou FIREBASE_CREDENTIALS_JSON)...")
        initialize_firebase() # Tenta carregar do arquivo local se outros métodos falharam
    elif os.environ.get("FIREBASE_CREDENTIALS_JSON") and not firebase_initialized_successfully:
        print("[MAIN_ENV_VAR] FIREBASE_CREDENTIALS_JSON está definida, mas Firebase não inicializou. Tentando novamente...")
        initialize_firebase() # Tenta novamente com a variável de ambiente
    
    if not firebase_initialized_successfully:
        print("[MAIN_EXECUTION_WARN] Firebase NÃO inicializado com sucesso no startup. O app pode ter problemas com rotas que dependem do Firebase.")
    else:
        print("[MAIN_EXECUTION_INFO] Firebase parece estar inicializado com sucesso.")
        # Opcional: Criar usuários de exemplo se o Firestore estiver acessível
        # criar_usuarios_firestore_exemplo() 

    port = int(os.environ.get("PORT", 8080)) # Render define a variável PORT
    print(f"[STARTUP_LOG] Script principal concluído em {time.time() - initialization_start_time:.4f} segundos. Iniciando servidor Flask em host 0.0.0.0 na porta {port}...")
    # Para o Render, debug=False é recomendado. Gunicorn lida com múltiplos workers.
    app.run(host='0.0.0.0', port=port, debug=False)
    # Este é um comentário de teste para forçar um novo commit