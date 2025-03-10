import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL_NOTIF = `${process.env.REACT_APP_SOCKET_IP}ws/notifications/`;

export default function useNotifications() {
	const [socket, setSocket] = useState(null);
	const [notifications, setNotifications] = useState([]);

	const navigate = useNavigate();

	useEffect(() => {
		
		const ws = new WebSocket(BASE_URL_NOTIF);

		ws.onopen = () => {};
		
		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
		
			if (data.type === "send_notification") {
				setNotifications((prev) => [
					...prev,
					{ type: data.type, target_id: data.targetId, message: data.message, sender_id: data.sender_id, room_name: data.room_name, response: null },
				]);
			} 
			else if (data.type === "send_invite") {
				setNotifications((prev) => [
					...prev,
					{ type: data.type, target_id: data.targetId, message: data.message, sender_id: data.sender_id, response: null },
				]);
			} 
			else if (data.type === "receive_response") {
				setNotifications((prevNotifications) => [
						...prevNotifications,
						{ type: data.type, target_id: data.targetId, message: data.message, sender_id: data.sender_id, response: data.response }
				]);
			}
			else if(data.type === "game_update") {
				navigate(`/game/${data.game_id}` , { state: { authorized:true } });
			}
		};

		ws.onclose = () => {};

		setSocket(ws);

		return () => {
			ws.close();
		};
	}, [navigate]);

	useEffect(() => {}, [notifications]);

	const sendInvite = (targetId, message, userId) => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			const notificationData = {
				type: "send_invite",
				target_id: targetId,
				sender_id: userId,
				message: message,
			};
			socket.send(JSON.stringify(notificationData));
		}
	};

	const sendNotification = (targetId, message, userId, room_name = undefined) => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			const notificationData = {
				type: "send_notification",
				target_id: targetId,
				sender_id: userId,
				message: message,
				room_name
			};
			socket.send(JSON.stringify(notificationData));
		}
	};

	const respondNotification = (targetId, response, senderId) => {

		if (socket && socket.readyState === WebSocket.OPEN) {
			const notificationData = {
				type: "receive_response",
				target_id: targetId,
				response: response,
				sender_id: senderId,
			};
			socket.send(JSON.stringify(notificationData));
		}
	};

	return { notifications, sendNotification, respondNotification, sendInvite };
}

