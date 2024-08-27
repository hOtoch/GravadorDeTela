let screenStream = null;
let webcamStream = null;
let micStream = null;
let tabAudioStream = null;
let mediaRecorder = null;
let recordedChunks = [];


async function getStreams(recordWebcam, webcamDeviceId, recordAudio, microphoneDeviceId) {


    try{
        // screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        // tabAudioStream = await navigator.mediaDevices.getUserMedia({ audio: { mediaSource: 'browser' } });
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true // Isso captura o áudio do sistema ou da aba, dependendo do navegador
        });
   
        if (recordWebcam) {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: webcamDeviceId } });
            
        }

        if (recordAudio) {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: microphoneDeviceId } });

            const audioContext = new AudioContext();
            const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
            const micAudioSource = audioContext.createMediaStreamSource(micStream);

            // Criar um destino para misturar os áudios
            const destination = audioContext.createMediaStreamDestination();
            screenAudioSource.connect(destination);
            micAudioSource.connect(destination);

            // Adicionar as pistas de áudio misturadas ao stream de tela
            destination.stream.getAudioTracks().forEach(track => screenStream.addTrack(track));
    
        }

    }catch(error){
        console.error('Erro ao acessar os dispositivos:', error);
    }

    
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.action === 'startRecordingContent') {

        console.log('startRecording no contentRecorder rodando');

        await getStreams(message.recordWebcam, message.webcamDevice, message.recordAudio, message.microphoneDevice);
    
        recordedChunks = [];
 
        const combinedStream = new MediaStream();

        screenStream.getTracks().forEach(track => combinedStream.addTrack(track));

        if (webcamStream) {
            webcamStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
        }

        // if (micStream) {
        //     micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        // }
    
        mediaRecorder = new MediaRecorder(combinedStream);

        console.log('Novo MediaRecorder criado.');
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
    
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);

            console.log(combinedStream.getAudioTracks());
            
            const downloadLink = document.createElement('a');
            downloadLink.href = videoUrl;
            downloadLink.download = 'gravacao.webm';
            downloadLink.click();

        };
    
        mediaRecorder.start();
        console.log('Gravação iniciada.');

        return true;
       
    }

    if (message.action === 'stopMediaRecorder') {
        if (mediaRecorder) {
            mediaRecorder.stop();
            console.log('Gravação parada.');
    
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
            }
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
            }
    
            mediaRecorder = null;
            recordedChunks = [];
        }
        // window.close();
    }

});

async function convertWebMToMP4(webmBlob) {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    // Converta o Blob WebM para um arquivo FFmpeg utilizável
    const webmArrayBuffer = await webmBlob.arrayBuffer();
    ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(webmArrayBuffer));

    // Execute a conversão
    await ffmpeg.run('-i', 'input.webm', 'output.mp4');

    // Obtenha o resultado da conversão
    const mp4Data = ffmpeg.FS('readFile', 'output.mp4');

    // Crie um Blob MP4
    const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });

    // Crie uma URL para download
    const mp4Url = URL.createObjectURL(mp4Blob);

    // Crie um link para download
    const a = document.createElement('a');
    a.href = mp4Url;
    a.download = 'video.mp4';
    a.click();
    
    // Libere a URL quando não for mais necessária
    URL.revokeObjectURL(mp4Url);
}



