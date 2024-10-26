# VozUnimed - Ferramenta Offline de Transcrição de Áudio de Ligações

**VozUnimed** é uma ferramenta de transcrição de áudio offline que utiliza o Vosk. Com este projeto, é possível fazer o upload de arquivos MP3 de gravações de ligações e transcrevê-los localmente, garantindo total privacidade e segurança, sem depender de uma conexão de internet.

## 📥 Instalação

1. Clone o repositório usando o comando abaixo:
    ```bash
    git clone https://github.com/MagnoEmanoel/vozunimed
    ```

2. Baixe o modelo Vosk (vosk-model-pt-fb-v0.1.1-20220516_2113) [aqui](https://alphacephei.com/vosk/models).
   - **Modelo usado**: vosk-model-pt-fb-v0.1.1-20220516_2113 (~1.6GB)
   - **WER**: 54.34 (coraa dev) | 27.70 (cv test)
   - **Fonte**: Modelo fornecido pelo projeto FalaBrazil, licenciado sob GPLv3.0.

3. Extraia o modelo para a pasta `models/` do projeto.

4. Instale as dependências do Node.js no diretório do projeto:
    ```bash
    npm install express fs vosk wav multer fluent-ffmpeg cors
    ```

5. Instale o **ffmpeg** (se ainda não o fez):
   - No Windows: Baixe o **ffmpeg** [aqui](https://ffmpeg.org/download.html) e instale-o no seu sistema. Configure o caminho do **ffmpeg** no arquivo `app.js`.

6. Atualize o caminho do modelo e do **ffmpeg** no arquivo `app.js` conforme o seu ambiente.

## ✅ Requisitos

- **Node.js** instalado no sistema.
- **ffmpeg** instalado e configurado no caminho correto.
- Navegador moderno com suporte a WebAssembly.
- Modelo Vosk descompactado na pasta correta (`models/`).

## 🚀 Como Usar

1. Execute o servidor Node.js:
    ```bash
    node app.js
    ```

2. Abra o arquivo `transcricao.html` no navegador.

3. Selecione um arquivo MP3 clicando no botão de upload.

4. Clique no botão **"Enviar Áudio"**.

5. Acompanhe o progresso do envio e da transcrição na tela.

6. A transcrição será exibida de forma rápida e precisa.

## 🆕 Atualizações Recentes

- Redução de ruído melhorada usando `arnndn` e filtro de frequências para áudio de baixa qualidade.
- Exibição de progresso durante o upload e a transcrição.

## 📌 Observações

- Para melhores resultados, utilize arquivos de áudio de boa qualidade.
