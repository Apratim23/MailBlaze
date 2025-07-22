console.log("Mailblaze - Content script loaded");

function createAIButton() {
    const button = document.createElement('button');
    button.className = 'mailblaze-button';
    button.style.marginRight = '8px';
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.backgroundColor = '#1a73e8';
    button.style.color = '#fff';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.setAttribute('title', 'Generate AI Reply');

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icon.png');
    img.alt = 'Mailblaze Logo';
    img.style.width = '18px';
    img.style.height = '18px';
    img.style.marginRight = '6px';
    img.style.verticalAlign = 'middle';

    const span = document.createElement('span');
    span.innerText = 'Mailblaze AI ✨';
    span.style.verticalAlign = 'middle';

    button.appendChild(img);
    button.appendChild(span);

    return button;
}


function getEmailContent() {
    const selectors=[
    '.h7', // Gmail compose toolbar
    '.a3s.aiL', // Outlook compose toolbar
    'gmail_quote', // Generic toolbar
    '[role="presentation"]', // Generic toolbar
];
for(const selector of selectors) {
    const content = document.querySelector(selector);
    if (content) return content.innerText.trim();
}
return '';
}

function findComposeToolbar() {
    const selectors=[
    '.aDh', // Gmail compose toolbar
    '.btC', // Outlook compose toolbar
    '[role="toolbar"]', // Generic toolbar
    '.gU.Up'
];
for(const selector of selectors) {
    const toolbar = document.querySelector(selector);
    if (toolbar) return toolbar;
}
return null;
}
function injectButton() {
    const existingButton = document.querySelector('.mailblaze-button');
    if (existingButton) existingButton.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Mailblaze - Compose toolbar not found");
        return;
    }

    const sendButton = toolbar.querySelector('div[role="button"][data-tooltip^="Send"]');
    if (!sendButton) {
        console.log("Mailblaze - Send button not found");
        return;
    }

    const button = createAIButton();
    button.classList.add('mailblaze-button');

    // Insert AI button just before the Send button
    sendButton.parentElement.insertBefore(button, sendButton);

    button.addEventListener('click', async () => {
        try {
            button.innerHTML = 'Generating...';
            button.disabled = true;

            const emailContent = getEmailContent();
            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailContent: emailContent,
                    tone: "professional",
                })
            });
            if (!response.ok) {
                throw new Error('API request failed');
            }

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
            } else {
                console.error("Mailblaze - Compose box not found");
            }
        } catch (error) {
            console.error(error);
            alert("Mailblaze - Error generating reply");
        } finally {
            button.innerHTML = 'Mailblaze AI ✨';
            button.disabled = false;
        }
    });

    console.log("Mailblaze - Button injected beside Send");
}


const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.aDh, .btC, [role="dialog"]') || node.querySelector('.aDh, .btC, [role="dialog"]'))
        );

        if (hasComposeElements) {
            console.log("Mailblaze - Compose elements detected, injecting script");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});