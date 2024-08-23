let screenStream = null;
let webcamStream = null;
let audioStream = null;
let mediaRecorder = null;
let recordedChunks = [];

async function getStreams(recordWebcam, webcamDeviceId, recordAudio, microphoneDeviceId) {

    try{
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        console.log('Tela capturada com sucesso.');

        if (recordWebcam) {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: webcamDeviceId } });
            console.log('Webcam acessada com sucesso.');
        }

        if (recordAudio) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: microphoneDeviceId } });
            console.log('Áudio acessado com sucesso.');
        }

    }catch(error){
        console.error('Erro ao acessar os dispositivos:', error);
    }

    
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Mensagem recebida no content.js:', message);

    if (message.action === 'startRecording') {

        await getStreams(message.recordWebcam, message.webcamDevice, message.recordAudio, message.microphoneDevice);
    
        recordedChunks = [];
 
        const combinedStream = new MediaStream([
            ...screenStream.getTracks(),
            ...(webcamStream ? webcamStream.getTracks() : []),
            ...(audioStream ? audioStream.getTracks() : [])
        ]);
    
        mediaRecorder = new MediaRecorder(combinedStream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
    
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            
            // const downloadLink = document.createElement('a');
            // downloadLink.href = videoUrl;
            // downloadLink.download = 'gravacao.webm';
            // downloadLink.click();

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
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }
    
            mediaRecorder = null;
            recordedChunks = [];
        }
        // window.close();
    }

});

