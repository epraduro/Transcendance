import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { showToast } from "../instance/ToastsInstance";
import useSocket from '../socket'
import useNotifications from "../SocketNotif"
import axiosInstance from "../instance/AxiosInstance";
import "./room.css"
import ModalInstance from "../instance/ModalInstance";
import Profile from "../users/Profile";
import Template from "../instance/Template";
import { useTranslation } from 'react-i18next';
import { useAuth } from "../users/AuthContext";

export default function Room() {

	const { t } = useTranslation();

	const { roomName } = useParams();
	const socket = useSocket('chat', roomName);
	const [dmname, setdmname] = useState(undefined);
	const [message, setMessage] = useState('');
	const [chat, setChat] = useState([]);
	const [listrooms, setlistrooms] = useState([]);
	const [friendList, setFriendList] = useState([]);
	const [users_room, setUsersRoom] = useState([]);
	const [dmrooms, setdmrooms] = useState([]);
	const [clickedNotifications, setClickedNotifications] = useState({});
	const maxLength = 300;
	const [caracteresRestants, setCaracteresRestants] = useState(maxLength);
	const [isModalProfile, setIsModalProfile] = useState(false);
	const [profileId, setProfileId] = useState(1);
	const modalProfile = useRef(null);
	const messagesEndRef = useRef(null);

	const navigate = useNavigate();
	const { userInfo } = useAuth();
	const userId = userInfo?.id;

	const { notifications, respondNotification, sendInvite } = useNotifications();

	const handleChange = (event) => {
		let texte = event.target.value;
		if (texte.length <= maxLength) {
			setMessage(texte);
			setCaracteresRestants(maxLength - texte.length);
		}
	};

	useEffect(() => {
		if (socket.ready) {
			socket.on('history', (data) => {
				const formattedMessages = data.messages.map(msg => ({
					username: msg.user,
					message: msg.content,
					timestamp: msg.timestamp
				}));
				setChat(formattedMessages);
			});
			socket.on('chat_message', (data) => {
				const newMessage = {
					username: data.username,
					message: data.message,
					timestamp: data.timestamp,
				}
				setChat((prevChat) => [...prevChat, newMessage]);
			});
			socket.on('join_room', (data) => {
				if (data.status) {
					navigate(`/room/${data.room_name}`);
				}
			});
			socket.on('error', (data) => {
				showToast('error', data.error);
			})
			return () => { }
		}
	}, [socket, navigate]);

	const sendMessage = (e) => {
		e.preventDefault();
		setCaracteresRestants(maxLength);
		if (socket.ready) {
			socket.send({
				type: 'send_message',
				room: roomName,
				message: message,
			});
			setMessage('');
		}
	};

	const clearRoom = async () => {
		try {
			await axiosInstance.post('/api/livechat/exit_room/', { room_name: roomName });
		} catch (error) {
			showToast("error", t('ToastsError'));
		}
	};

	const joinRoom = (name) => {
		if (socket.ready) {
			socket.send({
				type: "join_room",
				room_name: name
			});
		}
	};

	const listroom = useCallback(async () => {
		try {
			const response = await axiosInstance.get('/api/livechat/listroom/');

			const dmRooms = response.data.dmRooms.map((value) => {
				if (userInfo?.id === value.users[1]?.id)
					value.dmname = value.users[0]?.name + ' dm' ?? value.name;
				else
					value.dmname = value.users[1]?.name + ' dm' ?? value.name;
				return value;
			});
			setlistrooms(response.data.publicRooms);

			setdmrooms(dmRooms);
		} catch (error) {
			showToast("error", t('ToastsError'));
		}
	}, [userInfo?.id, setlistrooms, setdmrooms, t]);

	const handleRoomClick = (e, room) => {
		e.preventDefault();

		if (!room.name) {
			showToast("error", t('Toasts.NotRoomName'));
			return;
		}

		if (dmrooms.some(room => room.name === roomName) && roomName !== room.name) {
			joinRoom(room.name);
		}
		else if (roomName !== room.name) {
			clearRoom();
			joinRoom(room.name);
		}
		else if (roomName === room.name)
			showToast("error", t("Toasts.AlreadyRoom"));
	}

	const FriendList = useCallback(async () => {
		if(userInfo?.id)
		{
			try {
				const reponse = await axiosInstance.get(`/api/friends/list/${userInfo?.id}`);
				setFriendList(reponse.data);
			}
			catch(error) {
				showToast("error", t('ToastsError'));
			}
		}
	}, [userInfo?.id, setFriendList, t]);

	const Users_room_list = useCallback(async () => {
		try {
			const response = await axiosInstance.get(`/api/livechat/users_room/${roomName}`);
			setUsersRoom(response.data.filter((value) => value.id !== userId));
		}
		catch (error) {
			showToast("error", t('ToastsError'));
		}
	}, [roomName, setUsersRoom, userId, t]);

	const get_room = useCallback(async () => {
		try {
			const response = await axiosInstance.get(`/api/livechat/room/${roomName}`);
			const { dmname: roomPseudo } = response.data;
			setdmname(roomPseudo);
		}
		catch (error) {
			showToast("error", t('ToastsError'));
		}
	}, [roomName, setdmname, t]);

	useEffect(() => {
		if (userInfo.id) {
			listroom();
			FriendList();
			Users_room_list();
			get_room();
		}

		const interval = setInterval(() => {
			Users_room_list();
			listroom();
			FriendList();
		}, 5000);

		return () => clearInterval(interval);
	}, [roomName, userInfo?.id, listroom, FriendList, get_room, Users_room_list]);

	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
		}
	}, [chat]);

	const handleProfile = (user_id) => {
		setIsModalProfile(!isModalProfile);
		setProfileId(user_id);
	}

	const handleResponse = (notifId, response, senderId) => {
		if (!clickedNotifications[notifId]) {
			respondNotification(userId, response, senderId);
			setClickedNotifications((prev) => ({ ...prev, [notifId]: true }));
		}
	};

	return (
		<>
			<Template>
				<div className="general-room d-flex justify-content-between">
					<div className="listroom">
						<h5>{t('ListRooms')}</h5>
						<ul>
							{listrooms.map((room, index) => (
								<li key={index}>
									<Link to={`/room/${room.name}`} onClick={(e) => handleRoomClick(e, room)}>
										{room.name}
									</Link>
								</li>
							))}
						</ul>
					</div>
					<div className="chat">
						<button className="exit" onClick={() => { dmrooms.some(room => room.name === roomName) ? navigate(`/chat/`) : clearRoom() && navigate(`/chat/`) }}> {"⇦"} </button>
						<div className="titre">
							<h3>{t('RoomName')}: {dmname ? dmname : roomName}</h3>
						</div>
						<div ref={messagesEndRef} className="chat-messages">
							{chat.map((msg, index) => (
								<div key={index} style={{ marginBottom: '10px' }}>
									<small>({new Date(msg.timestamp).toLocaleTimeString()})</small>
									{' '}<strong>{msg.username}:</strong> {msg.message}{' '}
								</div>
							))}
						</div>
						<div className="saisi">
							<form onSubmit={sendMessage}>
								<div className="d-flex">
									<input id="chat-message-input" type="text" size="100" maxLength={maxLength} value={message} onChange={handleChange} />
									<button className="send" type='submit'> {"➤"} </button>
								</div>
								<p>{t('Characters')}: {caracteresRestants}</p>
							</form>
						</div>
					</div>
					<div className="List">
						<div className="User_list">
							<h5>{t('Friends')}</h5>
							<ul>
								{friendList?.friends?.length > 0 ? (
									friendList.friends.map((friend) => (
										<li key={friend.id}>
											{friend.name}
										</li>
									))
								) : (
									<li>{t('NoFriend')}</li>
								)}
							</ul>
						</div>
						<div>
							<h5>{t('OtherUsers')}</h5>
						</div>
						<div className="btn-group dropend">
							<ul>
								{users_room.map((user, index) => (
									<li key={index}>
										<button type="button" className="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
											{user.username}
										</button>
										<ul className="dropdown-menu">
											<button className="dropdown-item" onClick={() => handleProfile(user.id)}> {t('Profile')} </button>
											<button className="dropdown-item" onClick={() => sendInvite(user.id, `${userInfo.name} ${t('Pong')}`, userId)}> {t('PongInvitation')} </button>
										</ul>
									</li>
								))}
							</ul>
						</div>
						<ModalInstance height="30%" width="40%" isModal={isModalProfile} modalRef={modalProfile} name="Profile" onLaunchUpdate={null} onClose={() => setIsModalProfile(false)}>
							<Profile id={profileId} />
						</ModalInstance>
						<div>
							<h3>{t('Notifications')}</h3>
							<ul>
								
								{notifications.map((notif, index) => {
									if (notif.type) {
										if (notif.response) {
											return (<li><p>{t('Response')} : {notif.response}</p></li>)
										}
										if (notif.type === "send_invite") {
											return (
												<li>
													{notif.message}
													<button
														onClick={() => handleResponse(notif.id, "accept", notif.sender_id)}
														disabled={clickedNotifications[notif.id]}
													>
														✅ {t('Accept')}
													</button>
													<button
														onClick={() => handleResponse(notif.id, "decline", notif.sender_id)}
														disabled={clickedNotifications[notif.id]}
													>
														❌ {t('Decline')}
													</button>
												</li>
											)
										}
									}
								})}
								
							</ul>
						</div>
					</div>
				</div>
			</Template>
		</>
	);
}