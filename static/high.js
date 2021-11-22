const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userList = document.getElementById("users");
const uploadFile = document.getElementById("file");
const uploadForm = document.getElementById("uploadform");
const addIcon = document.querySelector("#addicon");

// Get username and room from URL
const username = getPlatformName() + "-" + getBrowserName();
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
var last_top = 0;
var new_top = 0;
chatMessages.addEventListener("scroll",()=>{
  new_top = chatMessages.scrollTop;
  if(new_top<50&&last_top>50&&addIcon.className.indexOf("fa-plus-circle")!=-1){
    console.log('trig')
    addIcon.click()
  }
  last_top=new_top;
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
// $("#file").on("change", () => {
//   // alert("up");
//   file_list = uploadFile.files;
//   outputMessage({
//     user: "log",
//     msg:
//       file_list.length +
//       " file" +
//       (file_list.length == 1 ? "" : "s") +
//       " will be uploaded.",
//     time: 100000000000,
//   });
//   for (var i = 0; i < file_list.length; i++) {
//     uploadForm.innerHTML += file_list[i].name + ";";
//   }
// });
const socket = io();

// Join chatroom
socket.on("connect",()=>{
  socket.emit("joinRoom", { username, room });
})

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
  const flag = chatMessages.scrollHeight - chatMessages.scrollTop < 1000;
  outputMessage(message["data"]);
  console.log(message["data"]);
  if (cb) cb();
  if (flag) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

// Message submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (uploadFile.files.length != 0) {
    upLoadFiles([]);
  }
  let msg = e.target.elements.msg.value;
  if (!msg) {
    return false;
  }
  socket.emit("my_broadcast_event", {
    data: {
      msg: msg,
      user: getPlatformName() + "-" + getBrowserName(),
    },
  });
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});
$("#up").click((e) => {
  e.preventDefault()
  if (uploadFile.files.length != 0) {
    upLoadFiles([]);
  }
});
function upLoadFiles(file_list) {
  const formData = new FormData(uploadForm);
  // const formData = new FormData();
  formData.append("user", username);
  console.log(formData);
  $.ajax({
    url: "/upload",
    type: "post",
    data: formData,
    processData: false,
    contentType: false,
    success: (res) => {
      console.log(res);
      $("#file").val("");
    },
    error: (e) => {
      console.log(e);
    },
  });
}
// Output message to DOM
function outputMessage(message, fromAddmore = false) {
  const div = document.createElement("div");
  div.classList.add("message");

  const p0 = document.createElement("p");
  p0.classList.add("meta");
  p0.innerHTML += `<span>${new Date(parseInt(message.time * 1000)).format(
    "yyyy-MM-dd hh:mm:ss"
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
  if (message.isFile) {
    const dowloadme = document.createElement("div");
    dowloadme.classList.add("downloadme");
    const h = document.createElement("a");
    h.setAttribute("href", "/download/" + message.msg.substr(6));
    // h.setAttribute("target", "_blank");
    h.innerHTML = '<i class="fas fa-download"></i>';
    dowloadme.appendChild(h);
    div.appendChild(dowloadme);
  } else {
    const copyme = document.createElement("div");
    copyme.classList.add("copyme");
    const i = document.createElement("i");
    i.classList.add("fas");
    i.classList.add("fa-clone");
    i.setAttribute("ptext", message.msg);
    copyme.appendChild(i);
    div.appendChild(copyme);
  }
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
