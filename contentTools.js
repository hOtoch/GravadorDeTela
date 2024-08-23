function createButton(iconPath, altText, buttonsDiv) {
    const button = document.createElement('button');
    button.classList.add('ButtonRecorder');
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL(iconPath);
    icon.alt = altText;
    button.appendChild(icon);
    buttonsDiv.appendChild(button);
    return button;
}

async function addButtonsToPage() {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.id = 'recorderButtonsDiv';

    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.gap = '10px';
    buttonsDiv.style.position = 'fixed';
    buttonsDiv.style.bottom = '0';
    buttonsDiv.style.right = '0';
    
    const playButton = createButton('icons/play.png', 'Retomar gravação', buttonsDiv);
    const pauseButton =createButton('icons/pausa.png', 'Pausar gravação', buttonsDiv);
    const stopButton =createButton('icons/stop.png', 'Parar gravação', buttonsDiv);
    const restartButton =createButton('icons/recarregar.png', 'Reiniciar gravação', buttonsDiv);

    stopButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stopRecording' });
    })

    const style = document.createElement('style');
    style.textContent = `
        .ButtonRecorder {
            background-color: #fff;
            border: 2px solid #007bff;
            border-radius: 5px;
            padding: 10px;
            cursor: pointer;
            outline: none;
            zIndex: 9999;
            transition: background-color 0.3s, border-color 0.3s;
        }

        .ButtonRecorder:hover {
            background-color: #007bff;
            border-color: #0056b3;
        }

        .ButtonRecorder:active {
            background-color: #0056b3;
            border-color: #00408a;
        }

        .ButtonRecorder img {
            vertical-align: middle;
            width: 24px;
            height: 24px;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(buttonsDiv);

}

// função para adicionar o vídeo da webcam ao DOM da página
async function addWebcamToPage(webcamDeviceId, webcamSize, webcamPosition) {
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


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Mensagem recebida no contentTools.js:', message);
    if (message.action === 'showWebcam') {

        window.localStorage.setItem('webcamInjected', 'true');

        console.log('Adicionando webcam à página...');
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

    else if(message.action === 'showButtons') {

        window.localStorage.setItem('buttonsInjected', 'true');

        console.log('Adicionando botões à página...');
        addButtonsToPage().then(() => {
            sendResponse({ status: 'buttons added to page' });
        }
        ).catch(error => {
            console.error('Erro ao adicionar botões à página:', error);
            sendResponse({ status: 'error', error: error.message });
        });

        return true;
    }

    else if (message.action === 'removeTools') {
        console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBB");
       
        const webcamVideo = document.querySelector('video');
        if(webcamVideo){
            webcamVideo.remove();
        }else{
            console.log("Não encontrou a webcam");
        }
        window.localStorage.removeItem('webcamInjected');
    
        
        const buttonsDiv = document.querySelector('#recorderButtonsDiv');
        if(buttonsDiv){
            buttonsDiv.remove();
        }else{
            console.log("Não encontrou os botões");
        }
        
        window.localStorage.removeItem('buttonsInjected');
        
    }


});