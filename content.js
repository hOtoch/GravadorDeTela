chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showWebcam') {
        console.log('Mensagem recebida no content.js:', message);
       
        addWebcamToPage(message.webcamDeviceId, message.webcamSize, message.webcamPosition)
            .then(() => {
                sendResponse({ status: 'webcam added to page' });
            })
            .catch(error => {
                console.error('Erro ao adicionar webcam à página:', error);
                sendResponse({ status: 'error', error: error.message });
            });
        return true;
    }
});
// Função para adicionar o vídeo da webcam ao DOM da página
async function addWebcamToPage(webcamDeviceId, webcamSize, webcamPosition) {
    console.log(webcamDeviceId, webcamSize, webcamPosition);
    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = await navigator.mediaDevices.getUserMedia({ video: { deviceId: webcamDeviceId } });
    webcamVideo.autoplay = true;

    // Define o tamanho da webcam
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

    // Define a posição da webcam na página
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
}
