let tabCriada = null;
let tabAtual = null;

let webcamState = {
    isRecording: false,
    webcamDeviceId: null,
    webcamSize: null,
    webcamPosition: null,
};


async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tabAtual] = await chrome.tabs.query(queryOptions);
    return tabAtual;
    
}

async function injectContentToolsScript(tabId){
    try{
        if (tabId && tabId !== chrome.tabs.TAB_ID_NONE){
            const tab = await chrome.tabs.get(tabId);

            // Verifica se a URL não é restrita
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('file://')) {
                console.error('Não é possível injetar scripts em URLs restritas:', tab.url);
                return { status: 'cannot inject content script into restricted URL' };
            }

            // Injetar o content.js na aba ativa
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['contentTools.js']
            });

            console.log('Content script injetado com sucesso');

        

        }
    } catch (error) {
        console.error('Erro ao injetar o content script: ', error)
    }
}

async function injectContentRecorderScript(tabId){
    try{
        // Injetar o contentRecorder.js na aba criada
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['contentRecorder.js']
        });

        console.log('contentRecorder injetado com sucesso');
    } catch (error) {
        console.error('Erro ao injetar o contentRecorder : ', error)
    }
}


chrome.tabs.onActivated.addListener(async (activeInfo) => {
    tabAtual = await getCurrentTab();
    console.log("Nova aba: ", tabAtual)
    await injectContentToolsScript(tabAtual.id);

    await chrome.tabs.sendMessage(tabAtual.id, {
        action: 'showButtons'
    });

    console.log(webcamState.isRecording, webcamState.webcamDeviceId, webcamState.webcamSize, webcamState.webcamPosition);

    await chrome.tabs.sendMessage(tabAtual.id, {
        action: 'showWebcam',
        webcamSize: webcamState.webcamSize,
        webcamPosition: webcamState.webcamPosition,
        webcamDeviceId: webcamState.webcamDevice
    });


})


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Mensagem recebida no background.js:', message);

    if (message.action === 'startRecording') {

        if(message.recordWebcam){
            webcamState.isRecording = true;
            webcamState.webcamDeviceId = message.webcamDevice;
            webcamState.webcamSize = message.webcamSize;
            webcamState.webcamPosition = message.webcamPosition;
        }

        console.log('Criando nova aba...');

        chrome.tabs.create({url: chrome.runtime.getURL('temporaryTab.html'), active : true}, async (newTab) => {
            tabCriada = newTab;

            chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

                if( tabId === tabCriada.id && changeInfo.status === 'complete'){

                    chrome.tabs.sendMessage(tabCriada.id, {
                        action: 'startRecording',
                        recordWebcam: message.recordWebcam,
                        webcamDevice: message.webcamDevice,
                        recordAudio: message.recordAudio,
                        microphoneDevice: message.microphoneDevice

                    });
                }
            });
        });

    }

    
    else if (message.action === 'stopRecording') {
        
        if (tabCriada && tabCriada.id){
            chrome.tabs.sendMessage(tabCriada.id, { action: 'stopMediaRecorder' });
        }

        chrome.tabs.query({}, function(tabs) {
            console.log('tabs:', tabs);
            for (let i = 0; i < tabs.length; i++) {
                chrome.tabs.sendMessage(tabs[i].id, { action: 'removeTools' });
            }
        })
       
        webcamState.isRecording = false;

        console.log('Gravação parada.');
    }

});

