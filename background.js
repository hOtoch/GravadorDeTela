let mediaRecorder;
let recordedChunks = [];

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Mensagem recebida no background.js:', message);

    if (message.action === 'startRecording') {
        startRecording(message);
    } 
    else if (message.action === 'stopRecording') {
        stopRecording();
    } 
    else if (message.action === 'showWebcam') {

        try {
            let tab = await getCurrentTab();
            console.log('Tab:', tab);

            // Verifica se a URL não é restrita
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('file://')) {
                console.error('Não é possível injetar scripts em URLs restritas:', tab.url);
                sendResponse({ status: 'cannot inject content script into restricted URL' });
                return;
            }

            // Injetar o content.js na aba ativa
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            console.log('Content script injetado com sucesso');

            // Enviar a mensagem ao content.js após a injeção
            chrome.tabs.sendMessage(tab.id, {
                action: 'showWebcam',
                webcamDeviceId: message.webcamDeviceId,
                webcamSize: message.webcamSize,
                webcamPosition: message.webcamPosition
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Erro ao enviar mensagem para content script:', chrome.runtime.lastError);
                    sendResponse({ status: 'failed to send message to content script' });
                } else {
                    console.log('Resposta do content script:', response);
                    sendResponse({ status: 'message sent to content script', response });
                }
            });
        } catch (error) {
            console.error('Erro ao processar a mensagem:', error);
            sendResponse({ status: 'error', error: error.message });
        }

        // Retorna true para indicar que a resposta é assíncrona
        return true;
    }
});



async function showWebcam(webcamSize, webcamPosition) {
    console.log('Tentando acessar a webcam...');
    let webcamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: webcamDeviceId } });

    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = webcamStream;
    webcamVideo.autoplay = true;

    switch (webcamSize) {
        case 'small':
            webcamVideo.style.width = '160px';
            webcamVideo.style.height = '120px';
            break;
        case 'medium':
            webcamVideo.style.width = '320px';
            webcamVideo.style.height = '240px';
            break;
        case 'large':
            webcamVideo.style.width = '480px';
            webcamVideo.style.height = '360px';
            break;
    }

    // Define a posição da webcam na tela
    webcamVideo.style.position = 'fixed';
    webcamVideo.style.zIndex = '9999';
    webcamVideo.style.pointerEvents = 'none';

    switch (webcamPosition) {
        case 'top-left':
            webcamVideo.style.top = '0';
            webcamVideo.style.left = '0';
            break;
        case 'top-right':
            webcamVideo.style.top = '0';
            webcamVideo.style.right = '0';
            break;
        case 'bottom-left':
            webcamVideo.style.bottom = '0';
            webcamVideo.style.left = '0';
            break;
        case 'bottom-right':
            webcamVideo.style.bottom = '0';
            webcamVideo.style.right = '0';
            break;
    }
    document.body.appendChild(webcamVideo);
    console.log('Webcam acessada com sucesso.');
    
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
}
