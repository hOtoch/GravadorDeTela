let tabCriada = null;
let tabAtual = null;
let onActivatedListener = null;
let onUpdatedListener = null;

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

    } catch (error) {
        console.error('Erro ao injetar o contentRecorder : ', error)
    }
}



async function registerOnActivatedListener(hasWebcam) {
    onActivatedListener = async (activeInfo) => {
        tabAtual = await getCurrentTab();

        const [isInjected] = await chrome.scripting.executeScript({
            target: { tabId: tabAtual.id },
            func: () => !!window.contentToolsInjected,
        });

        const [webcamInjected] = await chrome.scripting.executeScript({
            target: { tabId: tabAtual.id },
            func: () => !!window.webcamInjected,
        });

        const [buttonsInjected] = await chrome.scripting.executeScript({
            target: { tabId: tabAtual.id },
            func: () => !!window.buttonsInjected,
        });

        console.log('isInjected:', isInjected);

        if(!isInjected.result){

            console.log('Injetando contentTools na aba:', tabAtual.id);

            await injectContentToolsScript(tabAtual.id);
        }

        if(hasWebcam && !webcamInjected.result){

            await chrome.tabs.sendMessage(tabAtual.id, {
                action: 'showWebcam',
                webcamSize: webcamState.webcamSize,
                webcamPosition: webcamState.webcamPosition,
                webcamDeviceId: webcamState.webcamDeviceId
            });
        }

        if(!buttonsInjected.result){

            await chrome.tabs.sendMessage(tabAtual.id, {
                action: 'showButtons'
            });
        }
    };

    chrome.tabs.onActivated.addListener(onActivatedListener);
}


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.action === 'startRecording') {

        await registerOnActivatedListener(message.recordWebcam);

        if(message.recordWebcam){
            webcamState.isRecording = true;
            webcamState.webcamDeviceId = message.webcamDevice;
            webcamState.webcamSize = message.webcamSize;
            webcamState.webcamPosition = message.webcamPosition;
        }


        chrome.tabs.create({url: chrome.runtime.getURL('temporaryTab.html'), active : true}, async (newTab) => {
            tabCriada = newTab;

            onUpdatedListener = async (tabId, changeInfo, tab) => {

                if( tabId === tabCriada.id && changeInfo.status === 'complete'){

                    chrome.tabs.sendMessage(tabCriada.id, {
                        action: 'startRecordingContent',
                        recordWebcam: message.recordWebcam,
                        webcamDevice: message.webcamDevice,
                        recordAudio: message.recordAudio,
                        microphoneDevice: message.microphoneDevice

                    });
                }
            }

            chrome.tabs.onUpdated.addListener(onUpdatedListener);
            
        });

    }

    
    else if (message.action === 'stopRecording') {
        console.log('STOPRECORDING EXECUTANDO')
        
        if (tabCriada && tabCriada.id){
            await chrome.tabs.sendMessage(tabCriada.id, { action: 'stopMediaRecorder' });
            chrome.tabs.onUpdated.removeListener(onUpdatedListener);
            onUpdatedListener = null;
        }

        console.log('tabAtual:', tabAtual);

        if (tabAtual && tabAtual.id){
            await chrome.tabs.sendMessage(tabAtual.id, { action: 'removeTools', tab: tabAtual.title });
        }

        chrome.tabs.query({}, async function(tabs) {
            console.log('tabs:', tabs);
            for (let i = 0; i < tabs.length; i++) {

                try {
                    await chrome.tabs.sendMessage(tabs[i].id, { action: 'removeTools', tabId: tabs[i].title });
                } catch (error) {
                    console.error("Erro ao enviar mensagem para tab:", tabs[i].title, error);
                }
            }
        });
        
       
        webcamState.isRecording = false;

        if (onActivatedListener) {
            chrome.tabs.onActivated.removeListener(onActivatedListener);
            onActivatedListener = null;
        }


    }

});



