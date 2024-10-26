const express = require('express');
const fs = require('fs');
const vosk = require('vosk');
const wav = require('wav');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');

// Caminho completo do FFmpeg
const ffmpegPath = 'C:/Program Files/ffmpeg/bin/ffmpeg.exe';
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Caminho do modelo Vosk (mantido o caminho original, com nome alterado para "model")
const MODEL_PATH = "C:/Users/magno/voicewave/models/model";
let model;

try {
    model = new vosk.Model(MODEL_PATH);
    console.log("Modelo carregado com sucesso.");
} catch (error) {
    console.error("Erro ao carregar o modelo:", error);
    process.exit(1);  // Encerra o processo se houver um erro no carregamento do modelo
}

const SAMPLE_RATE = 8000; // Usar 8 kHz para telefonia
vosk.setLogLevel(0);

// Habilitar CORS
app.use(cors());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Função para converter o MP3 para WAV com taxa de amostragem de 8 kHz e aplicar redução de ruído com arnndn
function convertToWav(inputPath, outputPath, callback) {
    ffmpeg(inputPath)
        .inputFormat('mp3')  // Confirma que o arquivo de entrada é MP3
        .outputOptions([
            '-ac 1',                      // Converter para mono
            '-ar 8000',                   // Amostragem de 8 kHz para telefonia
            '-af', 'arnndn=m=rnnoise-model-file',  // Usando o modelo neural de redução de ruído RNNoise
            '-af', 'highpass=f=200',      // Filtro passa-altas, remove frequências abaixo de 200Hz
            '-af', 'lowpass=f=3400',      // Filtro passa-baixas, remove frequências acima de 3400Hz
            '-af', 'acompressor=threshold=-25dB:ratio=9:attack=200:release=500',  // Compressão para aumentar as partes mais baixas
            '-af', 'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB',  // Remove silêncios
        ])
        .on('progress', (progress) => {
            console.log(`Progresso da conversão: ${progress.percent}%`);
        })
        .on('end', () => {
            console.log(`Conversão para WAV concluída: ${outputPath}`);
            callback(null, outputPath);  // Chama a função de callback após a conversão
        })
        .on('error', (err) => {
            console.error('Erro durante a conversão: ', err);
            callback(err);  // Retorna o erro na função de callback
        })
        .save(outputPath);
}

// Endereço POST para upload do áudio
app.post('/upload', upload.single('audioFile'), (req, res) => {
    const audioPath = req.file.path;
    const wavPath = `uploads/${req.file.filename}.wav`;

    console.log(`Recebido arquivo: ${audioPath}`);

    // Iniciar conversão de MP3 para WAV com redução de ruído neural e amostragem de 8 kHz
    convertToWav(audioPath, wavPath, (err, wavFilePath) => {
        if (err) {
            return res.status(500).send('Erro durante a conversão de áudio.');
        }

        // Após a conversão, processar o arquivo WAV
        const reader = new wav.Reader();
        const recognizer = new vosk.Recognizer({
            model: model,
            sampleRate: SAMPLE_RATE,
            maxAlternatives: 3,   // Permitir múltiplas alternativas para melhorar a precisão
            words: true           // Captura as palavras individuais
        });

        let transcription = '';
        let totalSamples = 0;

        res.setHeader('Content-Type', 'text/plain'); // Define a resposta como texto simples
        res.setHeader('Transfer-Encoding', 'chunked'); // Permite envio em pedaços

        reader.on('format', (format) => {
            console.log('Formato do arquivo WAV:', format);
            if (format.sampleRate !== SAMPLE_RATE || format.channels !== 1) {
                console.error('Formato de áudio incorreto. Use mono e 8 kHz.');
                return res.status(400).send('Formato de áudio incorreto. Use mono e 8 kHz.');
            }
        });

        reader.on('data', (data) => {
            totalSamples += data.length;
            if (totalSamples < SAMPLE_RATE) {
                console.error('Erro: Áudio muito curto. Não há amostras suficientes para reconhecimento.');
                return res.status(400).send('Erro: Áudio muito curto. Não há amostras suficientes para reconhecimento.');
            }
            if (recognizer.acceptWaveform(data)) {
                const partialResult = recognizer.result();
                if (partialResult.text) {
                    transcription += partialResult.text + '\n';  // Adiciona a transcrição parcial
                    res.write(partialResult.text + '\n');  // Envia parte da transcrição para o frontend
                }
            }
        });

        reader.on('end', () => {
            // Adiciona o resultado final à transcrição
            const finalResult = recognizer.finalResult();
            transcription += finalResult.text;
            recognizer.free();

            console.log('Transcrição completa:', transcription.trim());
            res.write(finalResult.text + '\n');
            res.end(); // Finaliza a resposta

            // Deletar arquivos temporários
            fs.unlink(wavFilePath, (err) => { if (err) console.error('Erro ao deletar arquivo WAV:', err); });
            fs.unlink(audioPath, (err) => { if (err) console.error('Erro ao deletar arquivo original:', err); });
        });

        reader.on('error', (err) => {
            console.error('Erro ao processar o áudio:', err);
            res.status(500).send('Erro ao processar o áudio.');

            // Deletar arquivos temporários
            fs.unlink(wavFilePath, (err) => { if (err) console.error('Erro ao deletar arquivo WAV:', err); });
            fs.unlink(audioPath, (err) => { if (err) console.error('Erro ao deletar arquivo original:', err); });
        });

        fs.createReadStream(wavFilePath).pipe(reader);
    });
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
