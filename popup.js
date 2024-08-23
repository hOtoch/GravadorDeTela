document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-recording');
    const stopButton = document.getElementById('stop-recording');
    const recordWebcam = document.getElementById('record-webcam');
    const recordAudio = document.getElementById('record-audio');
    const webcamSize = document.getElementById('webcam-size');
    const webcamPosition = document.getElementById('webcam-position');
    const webcamDevice = document.getElementById('webcam-device');
    const microphoneDevice = document.getElementById('microphone-device');



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


    async function startRecording() {
        await chrome.runtime.sendMessage({ action: 'startRecording',
            recordWebcam: recordWebcam.checked,
            webcamDevice: webcamDevice.value,
            recordAudio: recordAudio.checked,
            microphoneDevice: microphoneDevice.value,
            webcamSize: webcamSize.value,
            webcamPosition: webcamPosition.value
        });
        
    }

    if (startButton && stopButton) {
        startButton.addEventListener('click', startRecording);
        stopButton.addEventListener('click', stopRecording);
    }
});
