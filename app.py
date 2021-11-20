from logging import debug
from flask import Flask, render_template, session, request, \
    copy_current_request_context
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect
from pymongo import MongoClient
import time,json,os,random
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGO_URI'))
mydb = client['share']
myset = mydb['clips']
counter_set = mydb['counters']


async_mode = None

app = Flask(__name__)
app.config.from_object('config')
socketio = SocketIO(app, async_mode=async_mode)

def getNextSequence(seq_name='clipseq'):
    query = {'_id':seq_name}
    update = {'$inc':{'seq_num':1}}
    counter_set.update_one(query,update)
    sequenceDocument = counter_set.find_one(query)
    # print(sequenceDocument)
    return sequenceDocument['seq_num']

# @app.route('/add',methods=['POST','GET'])
def insertOneMsg(Msg=None,User='UNDEFINED',Time=None):
    # if request.method == 'POST':
        # Msg = request.form.get('msg')
        # User = request.form.get('user','Undefined')
    # elif request.method == 'GET':
    #     Msg = request.args.get('msg',None)
    if not Msg:
        return 'No msg!'
    schema = {
        'seq':getNextSequence('clipseq'),
        'user':User,
        'msg':Msg,
        'time':Time if Time else time.time()
    }
    result = myset.insert_one(schema)
    return schema

def getMsgBetweenTime(time_min,time_max,asc=1):
    schema = {
        "time":{"$gte":time_min,"$lte":time_max}
    }
    result = myset.find(schema,{'_id':0}).sort('seq',asc)
    return list(result)

def getMsgBetweenSeq(seq_min,seq_max,asc=1):
    schema = {
        "seq":{"$gte":seq_min,"$lte":seq_max}
    }
    result = myset.find(schema,{'_id':0}).sort('seq',asc)
    return list(result)

@app.route('/before/<int:seq_max>')
def getMsgBeforeSeq(seq_max,num=2):
    num = int(request.args.get('num')) if request.args.get('num') else num
    schema = {
        "seq":{"$lte":seq_max}
    }
    result = myset.find(schema,{'_id':0}).sort('seq',-1).limit(num)
    return ({'data':list(result)})

@app.route('/latest')
@app.route('/latest/<int:num>')
def getLatestMsg(num=1,asc=1):
    latest_seq = counter_set.find_one({"_id":"clipseq"})['seq_num']
    schema = {
        "seq":{"$lte":latest_seq}
    }
    result = list(myset.find(schema,{'_id':0}).sort('seq',-1).limit(num))
    result.sort(key=lambda x:x['seq'])
    return ({'data':result})

@app.route('/index.html')
@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

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

def do_something_with_file(file):
    filename=hex(random.randint(16**3,16**4))[2:]+hex(int(time.time()*1000))[2:]+'-'+file.filename
    file.save(os.path.join(app.config.get('UPLOAD_FOLDER'), filename))
    result = insertOneMsg(Msg='@file:'+filename,User='todo')
    print(result)
    result.pop('_id')
    socketio.emit("my_response",{'data':result})
    return True

@app.route('/upload',methods=["POST"])
def upload_file():
    if request.method == 'POST':
        files = request.files.getlist('file')
        # print(len(files))
        if len(files) == 0:
            return {"msg": '失败'}
        for file in files:
            print(get_file_length(file))
            if get_file_length(file) == 0:
                continue
            filename = (file.filename)
            print(filename)
            do_something_with_file(file)
            # file.save(os.path.join(app.config.get('UPLOAD_FOLDER'), filename))
        return {'data':"ok"}
    return render_template('upload.html', msg='请上传')

@socketio.on('connect')
def connect():
    print('connect!',request.sid)
    emit('my_response', {'data': {'msg':'Connected','user':'SERVER','time':time.time()}, 'count': 0})

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)

@socketio.on('my_event')
def my_event(message):
    print(message)

@socketio.on('my_broadcast_event')
def my_broadcast_event(message):
    result = insertOneMsg(message['data']['msg'],message['data']['user'])
    print(result)
    result.pop('_id')
    emit('my_response',
         {'data': result}, 
         broadcast=True)


if __name__ == '__main__':
    socketio.run(app,host='0.0.0.0',port=5050)

