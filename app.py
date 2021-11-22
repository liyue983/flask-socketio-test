from logging import debug
from flask import Flask, render_template, session, request, \
    copy_current_request_context, send_from_directory, redirect, url_for, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect
from pymongo import MongoClient
import time
import json
import os
import random
import AES_Util
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URI'))
mydb = client['share']
myset = mydb['clips']
counter_set = mydb['counters']


async_mode = None

app = Flask(__name__)
app.config.from_object('config')
app.config['PUBLIC_PATH'] = [
    '/static/global.css', '/static/login.css', '/login']
app.config['LOGIN_KEY'] = os.environ.get("LOGIN_KEY", "")
AES_INS = AES_Util.AESUtil(os.environ.get("COOKIE_SKEY", ""))
socketio = SocketIO(app, async_mode=async_mode)


def getNextSequence(seq_name='clipseq'):
    query = {'_id': seq_name}
    update = {'$inc': {'seq_num': 1}}
    counter_set.update_one(query, update)
    sequenceDocument = counter_set.find_one(query)
    # print(sequenceDocument)
    return sequenceDocument['seq_num']

# @app.route('/add',methods=['POST','GET'])


def insertOneMsg(Msg=None, User='UNDEFINED', Time=None, isFile=False):
    # if request.method == 'POST':
    # Msg = request.form.get('msg')
    # User = request.form.get('user','Undefined')
    # elif request.method == 'GET':
    #     Msg = request.args.get('msg',None)
    if not Msg:
        return 'No msg!'
    schema = {
        'seq': getNextSequence('clipseq'),
        'user': User,
        'msg': Msg,
        'isFile': isFile,
        'time': Time if Time else time.time()
    }
    result = myset.insert_one(schema)
    return schema


def getMsgBetweenTime(time_min, time_max, asc=1):
    schema = {
        "time": {"$gte": time_min, "$lte": time_max}
    }
    result = myset.find(schema, {'_id': 0}).sort('seq', asc)
    return list(result)


def getMsgBetweenSeq(seq_min, seq_max, asc=1):
    schema = {
        "seq": {"$gte": seq_min, "$lte": seq_max}
    }
    result = myset.find(schema, {'_id': 0}).sort('seq', asc)
    return list(result)


@app.route('/before/<int:seq_max>')
def getMsgBeforeSeq(seq_max, num=2):
    num = int(request.args.get('num')) if request.args.get('num') else num
    schema = {
        "seq": {"$lte": seq_max}
    }
    result = myset.find(schema, {'_id': 0}).sort('seq', -1).limit(num)
    return ({'data': list(result)})


@app.route('/latest')
@app.route('/latest/<int:num>')
def getLatestMsg(num=1, asc=1):
    latest_seq = counter_set.find_one({"_id": "clipseq"})['seq_num']
    schema = {
        "seq": {"$lte": latest_seq}
    }
    result = list(myset.find(schema, {'_id': 0}).sort('seq', -1).limit(num))
    result.sort(key=lambda x: x['seq'])
    return ({'data': result})


@app.route('/index.html')
@app.route('/')
def index():
    return render_template('high.html', async_mode=socketio.async_mode)


@app.route('/chat')
def chat():
    return render_template('chat.html', async_mode=socketio.async_mode)


@app.route('/high')
def high():
    return render_template('high.html', async_mode=socketio.async_mode)


def get_file_length(file):
    file.seek(0, 2)
    file_length = file.tell()
    file.seek(0, 0)
    return file_length


def do_something_with_file(file, user="Undefined"):
    filename = hex(random.randint(16**3, 16**4)
                   )[2:]+hex(int(time.time()*1000))[2:]+'-'+file.filename
    file.save(os.path.join(app.config.get('UPLOAD_FOLDER'), filename))
    result = insertOneMsg(Msg='@file:'+filename, User=user, isFile=True)
    print(result)
    result.pop('_id')
    socketio.emit("my_response", {'data': result})
    return True


@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)


@app.route('/upload', methods=["POST"])
def upload_file():
    if request.method == 'POST':
        files = request.files.getlist('file')
        user = request.form.get("user")
        # print(len(files))
        if len(files) == 0:
            return {"msg": '失败'}
        for file in files:
            print(get_file_length(file))
            if get_file_length(file) == 0:
                continue
            filename = (file.filename)
            print(filename)
            do_something_with_file(file, user)
            # file.save(os.path.join(app.config.get('UPLOAD_FOLDER'), filename))
        return {'data': "ok"}
    return render_template('upload.html', msg='请上传')


@app.before_request
def before_req():
    if request.path in app.config['PUBLIC_PATH']:
        return
    try:
        userInf = request.cookies.get("userInf")
        userInf = json.loads(AES_INS.aesDecrypt(userInf))
        username = userInf['username']
        if username == app.config['LOGIN_KEY']:
            return
        return redirect(url_for('login'))
    except:
        return redirect(url_for('login'))


@app.route('/logout')
def logout():
    resp = make_response(redirect(url_for('index')))
    resp.set_cookie('userInf', '')
    return resp


@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "GET":
        try:
            userInf = request.cookies.get("userInf")
            userInf = json.loads(AES_INS.aesDecrypt(userInf))
            username = userInf['username']
            if username == app.config['LOGIN_KEY']:
                return redirect(url_for('index'))
            return render_template('login.html', msg="")
        except:
            return render_template('login.html', msg="")
    else:
        username = request.form.get("password")
        if username == app.config['LOGIN_KEY']:
            ret = {"username": username, "time": time.time()}
            resp = make_response(redirect(url_for('index')))
            resp.set_cookie('userInf', AES_INS.aesEncrypt(
                json.dumps(ret)), expires=time.time()+60*60*24*180)
            return resp
        else:
            return render_template('login.html', msg="Password error. ")


@socketio.on('connect')
def connect():
    print('connect!', request.sid)
    emit('my_response', {'data': {'msg': 'Connected',
         'user': 'SERVER', 'time': time.time()}, 'count': 0})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)


@socketio.on('my_event')
def my_event(message):
    print(message)


@socketio.on('my_broadcast_event')
def my_broadcast_event(message):
    result = insertOneMsg(message['data']['msg'], message['data']['user'])
    print(result)
    result.pop('_id')
    emit('my_response',
         {'data': result},
         broadcast=True)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5050)
