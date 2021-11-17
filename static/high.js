const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Get username and room from URL
const username = getPlatformName();
const room = getBrowserName();

$.get("/latest/15", function (data) {
    try {
        // alert(data);
        data["data"].forEach((element) => {
            outputMessage(element);
        });
    } catch (error) {
        console.log(error);
    }
});
$('.chat-messages').click(function (e) {
    if (e.target.className.indexOf('fa') != -1) {
        var ptext = e.target.getAttribute('ptext');
        console.log(ptext);
        e.target.classList.remove('fa-clone');
        e.target.classList.add('fa-check-circle')
        const input = document.createElement('input');
        input.value = ptext;
        input.setAttribute('readonly', 'readonly');
        document.body.appendChild(input);
        input.setSelectionRange(0, input.value.length);
        input.select();
        if (document.execCommand('copy')) {
            document.execCommand('copy');
            console.log('复制成功');
            setTimeout(() => { e.target.classList.add('fa-clone') }, 1000);
        }
        document.body.removeChild(input);
        // m.focus();

    }
});
const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
});

// Message from server
socket.on('message', message => {
    console.log(message);
    outputMessage(message);

    // Scroll down
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on("my_response", function (message, cb) {
    outputMessage(message["data"]);
    console.log(message['data'])
    if (cb) cb();
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', e => {
    e.preventDefault();

    // Get message text
    let msg = e.target.elements.msg.value;

    msg = msg.trim();

    if (!msg) {
        return false;
    }

    // Emit message to server
    socket.emit("my_broadcast_event", {
        data: {
            msg: msg,
            user: getPlatformName() + "-" + getBrowserName(),
        },
    });

    // Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');

    const p0 = document.createElement('p');
    p0.classList.add('meta');
    p0.innerHTML += `<span>${(new Date(parseInt(message.time * 1000))).format('yyyy.MM.dd hh:mm:ss')}</span>`;
    div.appendChild(p0);

    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = message.user;
    // p.innerHTML += `<span>${message.time}</span>`;
    div.appendChild(p);

    const para = document.createElement('pre');
    const code = document.createElement('code');
    code.innerText = htmlEncode(message.msg);
    para.appendChild(code);
    hljs.highlightElement(code);
    div.appendChild(para);

    const copyme = document.createElement('div');
    copyme.classList.add('copyme');
    const i = document.createElement('i');
    i.classList.add('fas');
    i.classList.add('fa-clone');
    i.setAttribute('ptext', message.msg);
    copyme.appendChild(i);
    div.appendChild(copyme);
    document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.innerText = user.username;
        userList.appendChild(li);
    });
}

Date.prototype.format = function (format) {
    var date =
    {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S+": this.getMilliseconds()
    };
    if (/(y+)/i.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in date) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
        }
    }
    return format;
};
function htmlEncode(html) {
    //1.首先动态创建一个容器标签元素，如DIV
    var temp = document.createElement("div");
    //2.然后将要转换的字符串设置为这个元素的innerText或者textContent
    (temp.textContent != undefined) ? (temp.textContent = html) : (temp.innerText = html);
    //3.最后返回这个元素的innerHTML，即得到经过HTML编码转换的字符串了
    var output = temp.innerHTML;
    temp = null;
    return output;
}