document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-recording');
    const stopButton = document.getElementById('stop-recording');
    const recordWebcam = document.getElementById('record-webcam');
    const recordAudio = document.getElementById('record-audio');
    const webcamSize = document.getElementById('webcam-size');
    const webcamPosition = document.getElementById('webcam-position');
    const webcamDevice = document.getElementById('webcam-device');
    const microphoneDevice = document.getElementById('microphone-device');

    let screenStream = null;
    let webcamStream = null;
    let audioStream = null;
    let mediaRecorder = null;

    if (!chrome.runtime) {
        // Chrome 20-21
        chrome.runtime = chrome.extension;
    } else if(!chrome.runtime.onMessage) {
        // Chrome 22-25
        chrome.runtime.onMessage = chrome.extension.onMessage;
        chrome.runtime.sendMessage = chrome.extension.sendMessage;
        chrome.runtime.onConnect = chrome.extension.onConnect;
        chrome.runtime.connect = chrome.extension.connect;
    }

    async function requestPermissions() {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log('Permissões concedidas');
        } catch (error) {
            console.error('Erro ao solicitar permissões:', error);
        }
    }

    async function populateDeviceSelectors() {
        await requestPermissions();
        const devices = await navigator.mediaDevices.enumerateDevices();
     
        devices.forEach(device => {
            if (device.kind === 'videoinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || 'Webcam';
                webcamDevice.appendChild(option);
            } else if (device.kind === 'audioinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || 'Microfone';
                microphoneDevice.appendChild(option);
            }
        });
    }

    populateDeviceSelectors();


    async function getStreams(recordWebcam, webcamDeviceId, recordAudio, microphoneDeviceId) {

        console.log('Tentando capturar a tela...');
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        console.log('Tela capturada com sucesso.');

        if (recordWebcam) {
            console.log('Tentando acessar a webcam...');
           chrome.runtime.sendMessage({
                action: 'showWebcam',
                webcamSize: webcamSize.value,
                webcamPosition: webcamPosition.value,
                webcamDeviceId: webcamDeviceId
            });

            console.log('Webcam acessada com sucesso.');

            webcamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: webcamDeviceId } });
        }

        if (recordAudio) {
            console.log('Tentando acessar o áudio...');
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: microphoneDeviceId } });
            console.log('Áudio acessado com sucesso.');
        }
    }

    async function startRecording() {
        await getStreams(recordWebcam.checked, webcamDevice.value, recordAudio.checked, microphoneDevice.value);
    
        
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
            chrome.runtime.sendMessage({
                action: 'saveRecording',
                videoUrl: videoUrl
            });
        };
    
        mediaRecorder.start();
        console.log('Gravação iniciada.');
        startButton.disabled = true;
        stopButton.disabled = false;
    }

    function stopRecording() {
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
        startButton.disabled = false;
        stopButton.disabled = true;
    }

    if (startButton && stopButton) {
        startButton.addEventListener('click', startRecording);
        stopButton.addEventListener('click', stopRecording);
    }
});
