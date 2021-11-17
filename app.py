from logging import debug
from flask import Flask, render_template, session, request, \
    copy_current_request_context
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect
from pymongo import MongoClient
import time,json

client = MongoClient('')
mydb = client['share']
myset = mydb['clips']
counter_set = mydb['counters']


async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)

def getNextSequence(seq_name='clipseq'):
    query = {'_id':seq_name}
    update = {'$inc':{'seq_num':1}}
    counter_set.update_one(query,update)
    sequenceDocument = counter_set.find_one(query)
    print(sequenceDocument)
    return sequenceDocument['seq_num']

# @app.route('/add',methods=['POST','GET'])
def insertOneMsg(Msg=None,User='UNDEFINED',Time=None):
    if request.method == 'POST':
        Msg = request.form.get('msg')
        User = request.form.get('user','Undefined')
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
    return str(schema)

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

@app.route('/latest')
@app.route('/latest/<int:num>')
def getLatestMsg(num=1,asc=1):
    latest_seq = counter_set.find_one({"_id":"clipseq"})['seq_num']
    seq_min = latest_seq-num+1
    asc = int(request.args.get('asc',asc))
    return ({'data':getMsgBetweenSeq(seq_min,latest_seq,asc),'l':'你好'})

@app.route('/index.html')
@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

@app.route('/chat')
def chat():
    return render_template('chat.html', async_mode=socketio.async_mode)


@socketio.on('connect')
def connect():
    print('connect!')
    emit('my_response', {'data': {'msg':'Connected','user':'SERVER','time':time.time()}, 'count': 0})

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)

@socketio.on('my_event')
def my_event(message):
    print(message)

@socketio.on('my_broadcast_event')
def my_broadcast_event(message):
    message['data']['time'] = time.time()
    insertOneMsg(message['data']['msg'],message['data']['user'],message['data']['time'])
    emit('my_response',
         {'data': message['data'], 'count': 0},
         broadcast=True)


if __name__ == '__main__':
    socketio.run(app,debug=True,host='0.0.0.0',port=5050)

