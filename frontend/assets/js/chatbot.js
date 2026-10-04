(function() {
    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/chatbot.css';
    document.head.appendChild(link);

    // Inject HTML
    const container = document.createElement('div');
    container.id = 'jrd-chatbot-container';
    container.innerHTML = `
        <div id="jrd-chat-window">
            <div class="jrd-chat-header">
                <h3><svg viewBox="0 0 24 24" width="18" height="18" fill="#00f2ff"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 1 0 7.5 16 1.5 1.5 0 0 0 7.5 13m9 0A1.5 1.5 0 1 0 16.5 16 1.5 1.5 0 0 0 16.5 13z"/></svg> JRD Assistant</h3>
                <div class="close-btn" id="jrd-chat-close">&times;</div>
            </div>
            <div class="jrd-chat-messages" id="jrd-chat-messages">
                <div class="msg-bubble msg-bot">Bonjour ! Je suis l'assistant JRD. Avez-vous besoin d'aide pour rédiger votre CV ou voulez-vous des exemples ?</div>
            </div>
            <div class="jrd-chat-input">
                <input type="text" id="jrd-chat-input-field" placeholder="Posez votre question..." autocomplete="off">
                <button id="jrd-chat-send">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
        <div id="jrd-chat-bubble">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </div>
    `;
    document.body.appendChild(container);

    // Elements
    const bubble = document.getElementById('jrd-chat-bubble');
    const chatWindow = document.getElementById('jrd-chat-window');
    const closeBtn = document.getElementById('jrd-chat-close');
    const sendBtn = document.getElementById('jrd-chat-send');
    const inputField = document.getElementById('jrd-chat-input-field');
    const messages = document.getElementById('jrd-chat-messages');

    // Toggle Chat
    bubble.addEventListener('click', () => {
        chatWindow.classList.add('active');
        bubble.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
        setTimeout(() => { bubble.style.display = 'flex'; }, 300);
    });
    // Send Message
    async function sendMessage() {
        const text = inputField.value.trim();
        if (!text) return;
        
        appendMessage('user', text);
        inputField.value = '';
        
        showTyping();

        // Check if the input is an Indeed URL
        if (text.includes('indeed.com') || text.includes('http')) {
            try {
                // Get CV text from the render area specifically
                const cvRender = document.getElementById('cv-render');
                const cvText = cvRender ? cvRender.innerText : document.body.innerText;
                
                const response = await fetch('/api/analyze_cv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: text, cv_text: cvText })
                });
                
                const data = await response.json();
                removeTyping();
                appendMessage('bot', data.suggestions || "Désolé, une erreur s'est produite lors de l'analyse.");
            } catch (error) {
                removeTyping();
                appendMessage('bot', "Erreur de connexion au serveur d'analyse.");
            }
            return;
        }

        // Fallback to rules-based logic
        setTimeout(() => {
            removeTyping();
            const response = getBotResponse(text);
            appendMessage('bot', response);
        }, 1000 + Math.random() * 1000);
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(sender, htmlContent) {
        const div = document.createElement('div');
        div.className = `msg-bubble msg-${sender}`;
        div.innerHTML = htmlContent;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    // Rules-based Bot Logic
    function getBotResponse(input) {
        const text = input.toLowerCase();
        
        if (text.includes('exemple') || text.includes('example')) {
            if (text.includes('profil') || text.includes('description') || text.includes('summary')) {
                return "Voici un exemple de <b>Profil / About Me</b> pour un Data Engineer : <pre>Data Engineer passionné avec 3 ans d'expérience dans la conception de pipelines ETL et l'architecture cloud (AWS). Capable de transformer des données brutes en informations exploitables pour guider les décisions stratégiques.</pre>";
            }
            if (text.includes('expérience') || text.includes('experience')) {
                return "Voici un exemple pour décrire une <b>Expérience</b> : <pre>• Conception et déploiement d'un data lake sur AWS S3.\n• Optimisation des requêtes SQL réduisant le temps de traitement de 40%.\n• Collaboration avec les data scientists pour l'industrialisation des modèles ML.</pre>";
            }
            if (text.includes('compétence') || text.includes('skills')) {
                return "Voici des exemples de <b>Compétences</b> à ajouter : <pre>• Langages : Python, SQL, Java\n• Cloud : AWS, GCP, Azure\n• Outils : Docker, Kubernetes, Git\n• Data : Spark, Kafka, Airflow</pre>";
            }
            return "Je peux vous donner des exemples pour :<br>- Profil (About Me)<br>- Expériences<br>- Compétences<br>Précisez votre demande !";
        }
        
        if (text.includes('cv') || text.includes('conseil') || text.includes('comment faire')) {
            return "Pour un bon CV, je vous conseille :<br>1. Choisissez un modèle épuré.<br>2. Mettez en avant vos résultats (chiffrez vos réussites).<br>3. Adaptez vos compétences à l'offre visée.<br>Vous pouvez aussi me donner un lien vers une offre Indeed pour que je l'analyse !";
        }
        
        if (text.includes('bonjour') || text.includes('salut')) {
            return "Bonjour ! Comment puis-je vous aider pour votre CV aujourd'hui ? Envoyez-moi un lien Indeed pour analyser l'offre et adapter votre CV !";
        }
        
        if (text.includes('merci')) {
            return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne création !";
        }
        
        return "Je ne suis pas sûr de comprendre. Vous pouvez me demander des conseils sur le CV, des <b>exemples</b> pour vos rubriques, ou coller un <b>lien Indeed</b> pour une analyse.";
    }
})();
