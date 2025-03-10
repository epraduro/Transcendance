import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { showToast } from "../instance/ToastsInstance";
import useSocket from '../socket'
import axiosInstance from "../instance/AxiosInstance";
import ModalInstance from "../instance/ModalInstance";
import Profile from "../users/Profile";
import Template from "../instance/Template";
import { useAuth } from "../users/AuthContext";

import "./Homechat.css"
import Room from './Room'

import useNotifications from "../SocketNotif"

import { useTranslation } from 'react-i18next';

export default function HomeChat() {

	const { t } = useTranslation();


	const { userInfo } = useAuth();
	const socket = useSocket('chat', 'public');
	const [createName, setCreateRoomName] = useState("");
	const [createdRoomName, setCreatedRoomName] = useState("");
	const [showCreatePublicRoom, setShowCreatePublicRoom] = useState(false);
	const [listrooms, setlistrooms] = useState([]);
	const [dmrooms, setdmrooms] = useState([]);
	const [usersconnected, setusersconnected] = useState([]);
	const [blockedUsers, setBlockedUsers] = useState([]);
	const [isModalProfile, setIsModalProfile] = useState(false);
	const [profileId, setProfileId] = useState();
	const modalProfile = useRef(null);

	const navigate = useNavigate();

	const handleChangeCreateRoom = (e) => setCreateRoomName(e.target.value);

	const [blockedData, setBlockedData] = useState({});
	
	useEffect(() =>{
		setBlockedData({
			from_user: userInfo?.id,
			to_user: '',
		})
	}, [userInfo?.id]);

	const { notifications, sendNotification } = useNotifications();

	useEffect(() => {
		if (socket.ready) {
			socket.on("create_room", (data) => {
				if (data.status) {
					setCreatedRoomName(data.room_name);
					navigate(`/room/${data.room_name}`);
				}
			});
			socket.on("join_room", (data) => {
				if (data.status) {
					navigate(`/room/${data.room_name}`);
				}
			});
			socket.on("error", (data) => {
				showToast('error', data.error);
			});
		}
	}, [socket, navigate]);

	const createRoom = (roomName, invited_user_id = undefined) => {
		if (roomName === "") {
			showToast("error", t('Toasts.NotEmptyName'));
			return;
		}
		if (socket.ready) {
			socket.send({
				type: "create_room",
				room_name: roomName,
				invited_user_id,
				invitation_required: true
			});
		}
	};

	const joinRoom = (name, dmname = null) => {
		if (socket.ready) {
			socket.send({
				type: "join_room",
				room_name: name,
				dmname
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
			if (error.response.status !== 401 )
				showToast("error", t('ToastsError'));
		}
	}, [userInfo?.id, setlistrooms, setdmrooms, t]);

	const users_connected = useCallback(async () => {
		try {
			const response = await axiosInstance.get('/api/livechat/users_connected/');
			setusersconnected(response.data.filter((v) => v.id !== userInfo.id));
		} catch (error) {
			if (error.response.status !== 401 )
				showToast("error", t('ToastsError'));
		}
	}, [userInfo?.id, setusersconnected, t]);


	const blocked_user = async (id) => {
		const updatedData = { ...blockedData, to_user: id || '' };
		try {
			const response = await axiosInstance.post(`/api/livechat/block/`, updatedData, {
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.status === 200) {
				listUsersBlocked();
				showToast("message", t('Toasts.BlockUsers'));
			}

		} catch(error) {
			if (error.response.status !== 401 )
				showToast("error", t('ToastsError'));
		}
	}

	const unlocked_user = async (id) => {
		const updatedData = { ...blockedData, to_user: id || '' };
		try {
			const response = await axiosInstance.post(`/api/livechat/unlock/`, updatedData, {
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.status === 200)
			{
				listUsersBlocked();
				showToast("succes", t('Toasts.UnblockUsers'));
			}

		} catch(error) {
			if (error.response.status !== 401 )
				showToast("error", t('ToastsError'));
		}
	}

	const listUsersBlocked = useCallback(async () => {
		if (userInfo?.id) { 
			try {
				const response = await axiosInstance.get(`/api/livechat/blocked_users/${userInfo.id}`);
				setBlockedUsers(response.data);
			}
			catch(error) {
				if (error.response.status !== 401 )
					showToast("error", t('ToastsError'));
			}
		}
	}, [userInfo?.id, setBlockedUsers, t]);

	useEffect(() => {
		if (userInfo.id)
		{
			users_connected();
			listroom();
			listUsersBlocked();
		}

		const interval = setInterval(() => {
			users_connected();
			listUsersBlocked();
			listroom();
		}, 5000);

		return () => clearInterval(interval);
	}, [userInfo?.id, users_connected, listroom, listUsersBlocked]);

	const handleRoomClick = async (e, room, dmname = null) => {
		e.preventDefault();

		if (!room.name) {
			showToast("error", t('Toasts.NotRoomName'));
			return;
		} else {
			joinRoom(room.name, dmname);
		}
	}

	const handleProfile = (user_id) => {
		setIsModalProfile(!isModalProfile);
		setProfileId(user_id);
	}

	function makeName(length) {
		let result = '';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;
		let counter = 0;
		while (counter < length) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
			counter += 1;
		}
		return result;
	}

	useEffect(() => {}, [profileId]);

	return (
		<Template>
			<div className="general-chat d-flex justify-content-between h-100 w-100">
				<div className="create-public-room">
					{showCreatePublicRoom ? (
						<>
							<input type="text" placeholder={t('RoomName')} value={createName} onChange={handleChangeCreateRoom} />
							<button onClick={() => setShowCreatePublicRoom(false)}>{t('Cancel')}</button>
							<button onClick={() => createRoom(createName)}>{t('NewRoom')}</button>
							{socket && createdRoomName && <Room/>}
						</>
					) : (
						<button onClick={() => setShowCreatePublicRoom(true)}>{t('NewRoom')}</button>
					)}

					<h5>{t('ListRooms')}</h5>
					<ul className="liste_salles">
						{listrooms && listrooms.map((room, index) => (
							<li key={index}>
								<Link to={`/room/${room.name}`} onClick={(e) => handleRoomClick(e, room)}>
									{room.name}
								</Link>
							</li>
						))}
					</ul>
					<h5>{t('ListDms')}</h5>
					<ul className="liste_dms"> 
						{dmrooms && dmrooms.map((room, index) => (
							<li key={index}>
								<Link to={`/room/${room.name}`} onClick={(e) => handleRoomClick(e, room, room.dmname)}>
									{room.dmname}
								</Link>
							</li>
						))}
					</ul>
				</div>
				<div>
					<h5>{t('ListUsers')}</h5>
					<div className="btn-group dropend">
						<ul>
							{usersconnected.map((user, index) => (
								<li key={index}>
									<button type="button" className="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
										{user.name}
									</button>
									<ul className="dropdown-menu">
										<button className="dropdown-item" onClick={() => handleProfile(user.id)}> {t('Profile')} </button>
										<button className="dropdown-item" onClick={() => {
											const randomRoomName = makeName(8);
											sendNotification(user.id, `${userInfo.name} ${t('Discussion')}`, userInfo.id, randomRoomName); 
											createRoom(randomRoomName, user.id);}}
										> {t('StartDiscussion')} </button>
										{!blockedUsers.includes(user.id) && (
											<button className="dropdown-item" onClick={() => blocked_user(user.id)}> {t('Block')} </button>
										)}
										{blockedUsers.includes(user.id) && (
											<button className="dropdown-item" onClick={() => unlocked_user(user.id)}> {t('Unblock')} </button>
										)}
									</ul>
								</li>
							))}
						</ul>
					</div>
					<ModalInstance
						height="13%"
						width="40%"
						isModal={isModalProfile}
						modalRef={modalProfile}
						name="Profile"
						onClose={() => setIsModalProfile(false)}
					>
						<Profile id={profileId}/>
					</ModalInstance>
					<div>
						<h3>{t('Notifications')}</h3>
						<ul>
							{notifications.map((notif, index) => (
								<li key={index}>
									{notif.message}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</Template>
	);
}
