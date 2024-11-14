document.addEventListener('DOMContentLoaded', function() {
    if (typeof Ably === 'undefined') {
        console.error('Ably library not loaded');
        return;
    }

    const ably = new Ably.Realtime('YPFBOw.qF16Aw:PSCKwfNVsUcDpbY_vUK-1qYofIDSpdzyPdvLQrMHCf0'); // Your Ably API key
    const channel = ably.channels.get('chat-channel');

    let nickname = localStorage.getItem('nickname') || '';
    const messages = document.getElementById('messages');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const userCountDisplay = document.getElementById('user-count');
    const pingSound = document.getElementById('ping-sound');
    const scrollDownButton = document.getElementById('scroll-down-button');
    const setNicknameButton = document.getElementById('set-nickname');
    const nicknameInput = document.getElementById('nickname');

    if (!messages || !form || !input || !userCountDisplay || !pingSound || !scrollDownButton || !setNicknameButton || !nicknameInput) {
        console.error('One or more required DOM elements are missing');
        return;
    }

    const usersOnline = new Set();
    const colors = {}; // Store colors for each user

    function updateOnlineUsers() {
        userCountDisplay.textContent = usersOnline.size;
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function scrollToBottom() {
        messages.scrollTop = messages.scrollHeight;
        if (messages.scrollHeight > messages.clientHeight) {
            scrollDownButton.style.display = 'block';
        } else {
            scrollDownButton.style.display = 'none';
        }
    }

    setNicknameButton.addEventListener('click', () => {
        const nicknameValue = nicknameInput.value.trim();
        
        if (nicknameValue && nicknameValue.length <= 20 && !nicknameValue.includes(' ') && /^[a-zA-Z0-9_]+$/.test(nicknameValue)) {
            if (nickname) {
                channel.publish('name-changed', { oldName: nickname, newName: nicknameValue });
            } else {
                channel.publish('user-connected', nicknameValue);
            }

            nickname = nicknameValue;
            localStorage.setItem('nickname', nickname);
            usersOnline.add(nickname);
            colors[nickname] = getRandomColor();
            updateOnlineUsers();
            
            setNicknameButton.textContent = 'Change Name';
            nicknameInput.value = '';
            
        } else {
            alert("Nickname must not contain spaces or special characters (except _), and must be less than or equal to 20 characters.");
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (input.value && nickname) {
            const messageData = { 
                user: nickname, 
                text: input.value, 
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) 
            };
            
            channel.publish('chat-message', messageData);
            input.value = '';
            scrollToBottom();
        } else if (!nickname) {
            alert("Please set your nickname before sending messages.");
        }
    });

    channel.subscribe('chat-message', function(message) {
        const itemContainer = document.createElement('div');
        const item = document.createElement('li');

        item.textContent = `${message.data.user}: ${message.data.text}`;
        item.style.color = colors[message.data.user] || 'black';

        const timeSpan = document.createElement('span');
        timeSpan.classList.add("message-time");
        timeSpan.textContent = `(${message.data.time})`;
        item.appendChild(timeSpan);

        item.classList.add("message");

        if (message.data.user === nickname) {
            item.classList.add("my-message");
            itemContainer.style.justifyContent = "flex-end";
        } else {
            item.classList.add("other-message");
            itemContainer.style.justifyContent = "flex-start";
        }

        itemContainer.classList.add("message-container");
        itemContainer.appendChild(item);

        if (message.data.text.includes(`@${nickname}`)) {
            pingSound.play();
            item.classList.add('pinged');
            setTimeout(() => item.classList.remove('pinged'), 3000);
        }

        messages.appendChild(itemContainer);
        scrollToBottom();
    });

    channel.subscribe('user-connected', function(user) {
        usersOnline.add(user);
        colors[user] = getRandomColor();
        updateOnlineUsers();
    });

    channel.subscribe('user-disconnected', function(user) {
        usersOnline.delete(user);
        updateOnlineUsers();
    });

    channel.subscribe('name-changed', function(data) {
        const itemContainer = document.createElement('div');
        const item = document.createElement('li');

        item.textContent = `${data.oldName} has changed their name to ${data.newName}.`;
        
        itemContainer.classList.add("message-container");
        itemContainer.appendChild(item);
        messages.appendChild(itemContainer);
    });

    scrollDownButton.addEventListener("click", () => {
        scrollToBottom();
        scrollDownButton.style.display = 'none';
    });

    function sendPrivateMessage(receiverNickname, messageText) {
        const privateMessageData = { from: nickname, to: receiverNickname, text: messageText };
        channel.publish('private-message', privateMessageData);
    }

    channel.subscribe('private-message', function(message) {
        if (message.data.to === nickname) {
            const itemContainer = document.createElement('div');
            const item = document.createElement('li');
            item.classList.add('private-message');
            item.textContent = `Private from ${message.data.from}: ${message.data.text}`;
            itemContainer.appendChild(item);
            messages.appendChild(itemContainer);
            scrollToBottom();
        }
    });

    // Initialize
    updateOnlineUsers();
});