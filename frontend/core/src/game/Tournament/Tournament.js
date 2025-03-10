import './Tournament.css';
import React, { useEffect, useState, useRef  } from "react";
import axiosInstance from '../../instance/AxiosInstance.js';
import { BrowserRouter as Router, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../users/AuthContext.js';
import { useLocation } from 'react-router-dom';
import person from '../../assets/game/person.svg';
import personAdd from '../../assets/game/person-fill.svg';
import TournamentBracket from "./TournamentBracket.js";
import Template from '../../instance/Template.js';
import MarioSection from './Mario.js';
import PacmanSection from './Pacman.js';
import { showToast } from '../../instance/ToastsInstance.js';
import { useTranslation } from 'react-i18next';

function Tournament() {
    const { tournamentCode } = useParams();
    const [tournamentResponse, setTournamentResponse] = useState(null);
    const [tournamentStarted, setTournamentStarted] = useState(false);
    const { t } = useTranslation();

    const navigate = useNavigate();
    const location = useLocation();
    const { makeTournament } = location.state || false;
    const { authorized } = location.state || false;

    const { userInfo } = useAuth();
    
    const socketRef = useRef(null);

    useEffect(() => {
       if (tournamentStarted && !socketRef.current && userInfo.name) {
            const newSocket =  new WebSocket(`${process.env.REACT_APP_SOCKET_IP}ws/tournament/${tournamentCode}/`);
            socketRef.current = newSocket;
            newSocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.full === true){
                    socketRef.current.close();
                    socketRef.current = null;
                    navigate("/home");
                }
                if (data.game_id && (data.player1 === userInfo.name || data.player2 === userInfo.name)) {
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        socketRef.current.close();
                        socketRef.current = null;
                    }
                   navigate(`/game/${data.game_id}` , { state: { authorized:true } });
                }
                if (data.type === 'user_connected_message') {
                    fetchTournement();
                }
                if (data.type === 'tournament_update') {
                    socketRef.current.close();
                    socketRef.current = null;
                    navigate("/home");
                }
                if (data.type === 'Timer') {
                    setIsRunning(true);
                }
           }
        }
           return () => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ "Abort": "Abort tournament" }));
                socketRef.current.close();
                socketRef.current = null;
            }
        };
     }, [userInfo, tournamentCode, tournamentStarted]);


    const fetchTournement = async () => {
        try {
            const response = await axiosInstance.get(`/api/game/fetch_data_tournament_by_code/${tournamentCode}`);
            if (response.data.status === "aborted" || response.data.status === "finished"){
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.close();
                    socketRef.current = null;
                }
                navigate("/home");
            }
            setTournamentResponse(response.data);
        } catch (error) {
            showToast("error", t('ToastsError'));
        }
    };

    const [seconds, setSeconds] = useState(3);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let count = 3;
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                count--;
                setSeconds(count);
                if (count === 0) {
                    clearInterval(interval);
                    setIsRunning(false);
                        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                            socketRef.current.send(JSON.stringify({ "Start": "Start games" }));
                    }
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isRunning]);

    const startTournament = () => {
        if (tournamentResponse.players_connected !== tournamentResponse.size) {
            showToast("error", t(`need ${tournamentResponse.size} players`));
            return;
        }
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ "Timer": "Start timer" }));
            return;
        }
        if (!isRunning) {
            setSeconds(3);
            setIsRunning(true);
        }
    };

    useEffect(() => {
        if (tournamentCode) {
            if (authorized === undefined)
            {
                navigate("/home");
            }
            fetchTournement();
            setTournamentStarted(true);
        }
    }, [tournamentCode]);

    useEffect(() => {
        if (makeTournament === true) {
            const retryInterval = 3000;
            let retryTimer = null;
    
            const attemptToSendMessage = () => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ "message": "Updating Tournament ..." }));
                    clearInterval(retryTimer);
                }
            };
    
            retryTimer = setInterval(() => {
                attemptToSendMessage();
            }, retryInterval);
    
            return () => {
                if (retryTimer) {
                    clearInterval(retryTimer);
                }
            };
        }
    }, [makeTournament]);
    
    useEffect(() => {
        if (tournamentResponse && tournamentResponse.winner_final) {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.close();
                socketRef.current = null;
            }
            
            navigate("/Home", { 
                state: { 
                    modalName: 'resultTournament',
                    tournamentCode: tournamentCode 
                }
            });
        }
    }, [tournamentResponse]);

        const renderImageWithClick = (src, alt, style, onClick, title) => (
            <img
                src={src}
                alt={alt}
                style={style}
                onClick={onClick}
                title={title}
            />
        );

    
    const renderPlayerImages = (numberPlayer, numberPlayerCo) => (
    
        [
            ...Array.from({ length: numberPlayerCo }).map((_, index) => (
                <img key={index + (numberPlayer - numberPlayerCo)} src={personAdd} alt={`Player ${index + 1}`} className="player-icon" />
            )),
            ...Array.from({ length: numberPlayer - numberPlayerCo }).map((_, index) => (
                <img key={index} src={person} alt={`Player ${index + 1}`} className="player-icon" />
            ))
        ]
    );
    return (
        <Template>
            {isRunning ? (
                <div className="h-100 w-100 d-flex" style={{ backgroundColor: 'black', alignItems: 'center', justifyContent:'center', textAlign: 'center'}}>
                    <span className="counter" style={{ fontSize: '30rem'}}>{seconds}</span>
                </div>
           ) : (
            <div className="tournament background h-100 w-100">
                <div className="w-100" style={{ position: "absolute", height: "10%", marginTop: "3%" }}>
                        <div className="tournament-text d-flex flex-row w-100">
                            <div className="d-flex flex-column h-100 w-25">{t('TournamentCode')}</div>
                            <div className="d-flex flex-column h-100 w-25">{t('Time')}</div>
                            <div className="d-flex flex-column h-100 w-25">{t('MaxScore')}</div>
                            <div className="d-flex flex-column h-100 w-25">{t('Players')}</div>
                        </div>
                        <div className="tournament-text d-flex flex-row w-100">
                            <div className="d-flex flex-column h-100 w-25">{tournamentResponse?.code || "X"} </div>
                            <div className="d-flex flex-column h-100 w-25">
                                {String(tournamentResponse?.timeMaxMinutes || "00").padStart(2, "0")} : {String(tournamentResponse?.timeMaxSecondes || "00").padStart(2, "0")}
                            </div>
                            <div className="d-flex flex-column h-100 w-25">{tournamentResponse?.scoreMax || "0"}</div>
                            <div className="d-flex flex-column h-100 w-25">{tournamentResponse?.size || "X"}</div>
                        </div>
                    </div>
                    <div className="players-container d-flex flex-row w-100 " style={{ position: "absolute", height: "12%", marginTop: "11%", textAlign: `center`, alignItems: `center`, justifyContent: `center` }}>
                        <div className="players-co">
                            {renderPlayerImages(tournamentResponse?.size, tournamentResponse?.players_connected || 0)}
                        </div>
                    </div>
                    <MarioSection tournamentResponse={tournamentResponse} renderImageWithClick={renderImageWithClick} onStartTournament={startTournament}/>
                    <PacmanSection tournamentResponse={tournamentResponse} renderImageWithClick={renderImageWithClick}/>
                    <div className="tree-tournament" >
                        <TournamentBracket numberPlayer={tournamentResponse?.size} tournamentResponse={tournamentResponse}/>
                    </div>
            </div>
        )}
        </Template>
    );
}

export default Tournament;