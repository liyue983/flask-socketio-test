const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");

// Get username and room from URL
const username = getPlatformName();
const room = getBrowserName();
var messageList = [];

$.get("/latest/15", function (data) {
  try {
    // alert(data);
    data["data"].sort((a, b) => {
      return a["seq"] - b["seq"];
    });
    data["data"].forEach((element) => {
      outputMessage(element);
      messageList.push(element);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    console.log(error);
  }
});
$(".chat-messages").click(function (e) {
  //addmore button
  if (e.target.className.indexOf("fa-plus-circle") != -1) {
    // console.log("more");
    e.target.classList.remove("fa-plus-circle");
    e.target.classList.add("fa-spinner");
    e.target.classList.add("fa-spin");
    $.get(
      "/before/" + (messageList[0]["seq"] - 1) + "?num=10",
      function (data) {
        const cur_scroll_top = chatMessages.scrollTop;
        const cur_scroll_height = chatMessages.scrollHeight;
        try {
          data["data"].sort((a, b) => {
            return b["seq"] - a["seq"];
          });
          data["data"].forEach((element) => {
            outputMessage(element, (fromAddmore = true));
            messageList.unshift(element);
          });
        } catch (error) {
          console.log(error);
        }
        chatMessages.scrollTop =
          chatMessages.scrollHeight - cur_scroll_height + cur_scroll_top;
        e.target.classList.remove("fa-spinner");
        e.target.classList.remove("fa-spin");
        e.target.classList.add("fa-plus-circle");
      }
    );
  }

  //copy button
  if (e.target.className.indexOf("fa-clone") != -1) {
    var ptext = e.target.getAttribute("ptext");
    console.log(ptext);
    e.target.classList.remove("fa-clone");
    e.target.classList.add("fa-spinner");
    e.target.classList.add("fa-spin");
    const input = document.createElement("textarea");
    input.value = ptext;
    input.setAttribute("readonly", "readonly");
    document.body.appendChild(input);
    input.setSelectionRange(0, input.value.length);
    input.select();
    if (document.execCommand("copy")) {
      document.execCommand("copy");
      console.log("复制成功");
      setTimeout(() => {
        e.target.classList.remove("fa-spinner");
        e.target.classList.remove("fa-spin");
        e.target.classList.add("fa-check-circle");
        setTimeout(() => {
          e.target.classList.remove("fa-check-circle");
          e.target.classList.add("fa-clone");
        }, 700);
      }, 200);
    }
    document.body.removeChild(input);
  }
});
const socket = io();

// Join chatroom
socket.emit("joinRoom", { username, room });

// Get room and users
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on("message", (message) => {
  console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on("my_response", function (message, cb) {
  outputMessage(message["data"]);
  console.log(message["data"]);
  if (cb) cb();
  if (chatMessages.scrollHeight - chatMessages.scrollTop < 1000) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

// Message submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  //   msg = msg.trim();
  // console.log(msg);

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
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message, fromAddmore = false) {
  const div = document.createElement("div");
  div.classList.add("message");

  const p0 = document.createElement("p");
  p0.classList.add("meta");
  p0.innerHTML += `<span>${new Date(parseInt(message.time * 1000)).format(
    "yyyy.MM.dd hh:mm:ss"
  )}</span>`;
  div.appendChild(p0);

  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = message.user;
  // p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);

  const para = document.createElement("pre");
  para.innerHTML = "<code>" + htmlEncode(message.msg) + "</code>";
  hljs.highlightElement(para.childNodes[0]);
  div.appendChild(para);

  const copyme = document.createElement("div");
  copyme.classList.add("copyme");
  const i = document.createElement("i");
  i.classList.add("fas");
  i.classList.add("fa-clone");
  i.setAttribute("ptext", message.msg);
  copyme.appendChild(i);
  div.appendChild(copyme);
  if (fromAddmore) {
    $(".more-msg").after(div);
  } else {
    document.querySelector(".chat-messages").appendChild(div);
  }
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

Date.prototype.format = function (format) {
  var date = {
    "M+": this.getMonth() + 1,
    "d+": this.getDate(),
    "h+": this.getHours(),
    "m+": this.getMinutes(),
    "s+": this.getSeconds(),
    "q+": Math.floor((this.getMonth() + 3) / 3),
    "S+": this.getMilliseconds(),
  };
  if (/(y+)/i.test(format)) {
    format = format.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  }
  for (var k in date) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length == 1
          ? date[k]
          : ("00" + date[k]).substr(("" + date[k]).length)
      );
    }
  }
  return format;
};
function htmlEncode(html) {
  //1.首先动态创建一个容器标签元素，如DIV
  var temp = document.createElement("div");
  //2.然后将要转换的字符串设置为这个元素的innerText或者textContent
  temp.textContent != undefined
    ? (temp.textContent = html)
    : (temp.innerText = html);
  //3.最后返回这个元素的innerHTML，即得到经过HTML编码转换的字符串了
  var output = temp.innerHTML;
  temp = null;
  return output;
}
