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

// Caminho do modelo Vosk
const MODEL_PATH = "C:/Users/magno/voicewave/models/model";
let model;

try {
    model = new vosk.Model(MODEL_PATH);
    console.log("Modelo carregado com sucesso.");
} catch (error) {
    console.error("Erro ao carregar o modelo:", error);
    process.exit(1);  // Encerra o processo se houver um erro no carregamento do modelo
}

const SAMPLE_RATE = 16000; // Define a frequência correta
vosk.setLogLevel(0);

// Habilitar CORS
app.use(cors());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Função para converter o áudio para WAV com taxa de amostragem correta
function convertToWav(inputPath, outputPath, callback) {
    ffmpeg(inputPath)
        .outputOptions(['-ac 1', '-ar 16000'])  // Converte para mono e 16 kHz
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

    // Iniciar conversão de MP3 para WAV
    convertToWav(audioPath, wavPath, (err, wavFilePath) => {
        if (err) {
            return res.status(500).send('Erro durante a conversão de áudio.');
        }

        // Após a conversão, processar o arquivo WAV
        const reader = new wav.Reader();
        const recognizer = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

        let transcription = '';
        let totalSamples = 0;

        reader.on('format', (format) => {
            console.log('Formato do arquivo WAV:', format);
            if (format.sampleRate !== SAMPLE_RATE || format.channels !== 1) {
                console.error('Formato de áudio incorreto. Use mono e 16 kHz.');
                return res.status(400).send('Formato de áudio incorreto. Use mono e 16 kHz.');
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
                if (partialResult.text && !transcription.includes(partialResult.text)) {
                    transcription += partialResult.text + '\n';  // Adiciona a transcrição parcial
                }
            }
        });

        reader.on('end', () => {
            // Adiciona o resultado final à transcrição
            const finalResult = recognizer.finalResult();
            transcription += finalResult.text;
            recognizer.free();

            console.log('Transcrição completa:', transcription.trim());
            res.json({ transcription: transcription.trim() });

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