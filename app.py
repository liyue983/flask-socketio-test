from logging import debug
from flask import Flask, render_template, session, request, \
    copy_current_request_context
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect


async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)

@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)


@socketio.on('connect')
def connect():
    print('connect!')
    emit('my_response', {'data': 'Connected', 'count': 0})

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)

@socketio.on('my_event')
def my_event(message):
    print(message)

@socketio.on('my_broadcast_event')
def my_broadcast_event(message):
    emit('my_response',
         {'data': message['data'], 'count': 0},
         broadcast=True)


if __name__ == '__main__':
    socketio.run(app,debug=True)

