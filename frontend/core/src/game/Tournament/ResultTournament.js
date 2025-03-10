import './Tournament.css';
import React, { useState, useEffect } from 'react';
import fisrtPrize from '../../assets/1prize.png';
import secondPrize from '../../assets/2prize.png';
import thirdPrize from '../../assets/3prize.png';
import star from '../../assets/star.png';

import { useTranslation } from 'react-i18next';
import axiosInstance from "../../instance/AxiosInstance";
import { showToast } from '../../instance/ToastsInstance.js';


function ResultTournament({ items, setItems, setModalResult, setModalStats, removeLaunch, launching, tournamentCode }) {

    const { t } = useTranslation();
    const [tournamentResponse, setTournamentResponse] = useState({});
    
        useEffect(() => {
            
            if(tournamentCode === "") { return;}
            const fetchTournement = async () => {
                try {
                    const response = await axiosInstance.get(`/api/game/fetch_data_tournament_by_code/${tournamentCode}`);
                    setTournamentResponse(response.data);
                } catch (error) {
                    showToast("error", t('ToastsError'));
                }
            };
            if(tournamentCode)
                fetchTournement();
          }, [tournamentCode]);
    
        const handleClick = (e) => {
            e.stopPropagation();
            
            try {
                const itemsActiv = items.map(item => ({
                    ...item,
                    active: item.name === 'global' || item.name === 'Tournament'
                }));
                setItems(itemsActiv);
                launching({ newLaunch: 'stats', setModal: setModalStats });

                setTimeout(() => {
                    setModalResult(false);
                    removeLaunch("tournament");
                    removeLaunch("resultTournament");
                }, 100);
            } catch (error) {
            }
        };        

    return (
        <div className="tournament background h-100 w-100">
                <img 
                    src={fisrtPrize} 
                    alt="first" 
                    className="trophy-first" 
                    style={{ 
                        position: 'absolute', 
                        right: 'clamp(33%, 35%, 60%)',
                        top: 'clamp(0%, 4%, 5%)',
                        height: 'clamp(40px, 14vh, 150px)',
                        width: 'auto',
                        zIndex: '1049'
                    }}
                />
                <img 
                    src={secondPrize} 
                    alt="second" 
                    className="trophy-second" 
                    style={{ 
                        position: 'absolute', 
                        zIndex: '1049', 
                        left: 'clamp(5%, 15%, 20%)', 
                        top: 'clamp(14%, 16%, 5%)', 
                        height: 'clamp(40px, 14vh, 150px)',
                        width: 'auto'
                    }}
                />
                <img 
                    src={thirdPrize} 
                    alt="third" 
                    className="trophy-third" 
                    style={{ 
                        position: 'absolute', 
                        zIndex: '1049', 
                        right: 'clamp(5%, 15%, 20%)', 
                        top: 'clamp(14%, 16%, 5%)', 
                        height: 'clamp(40px, 14vh, 150px)', 
                        width: 'auto'
                    }}
                />
            <div className="w-100 d-flex" style={{ position: 'absolute', height: '10%' }}>
                <div className="tournament-text h-100 d-flex w-50 justify-content-start align-items-center" style={{ paddingTop:'2%', paddingLeft:'7%', fontSize: 'clamp(0.5rem, 1vw, 1rem)'}}>
                    {tournamentResponse.code || "000"}
                </div>
                <div className="tournament-text h-100 d-flex w-50 justify-content-end align-items-center" style={{ paddingTop:'2%', paddingRight:'7%', fontSize: 'clamp(0.5rem, 1vw, 1rem)'}}>
                    {tournamentResponse.date || "00/00/00"}
                </div>
            </div>
            <div className="w-100 d-flex flex-column align-items-center" style={{ position: 'absolute', height: '34%', top: '19%' }}>
                <div className="d-flex justify-content-center align-items-center w-100" style={{ height: '36%', marginTop:'7%' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize:'150%', width:'30%'}} className="tournament-text podium d-flex h-100 justify-content-center align-items-center ">{tournamentResponse.first || "first player"}</div>
                </div>
                <div className="d-flex justify-content-center w-100" style={{ height: '32%'}}>
                    <div  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize:'130%', width:'30%'}}  className="tournament-text podium d-flex h-100 justify-content-center align-items-center">{tournamentResponse.second || t('SecondPlayer')}</div>
                    <div  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize:'110%', width:'30%'}}  className="tournament-text podium d-flex h-100 justify-content-center align-items-center">{tournamentResponse.size > 2 ? tournamentResponse.third : ""}</div>
                </div>
            </div>

            <div className="horizontal-line" style={{width:'80%', right:'10%', position: 'absolute', top:'50%', backgroundColor: 'white', height: '1%'}}></div>
            <div className="tournament-text w-100 d-flex flex-column" 
                style={{ paddingLeft: '8%', paddingRight: '8%', position: 'absolute', textTransform: 'none', height: '45%', top: '55%', fontSize: 'clamp(1.2rem, 1.5vw, 1rem)' }}>
                {[
                    { place: "RANKING", name: "PSEUDO" },
                    { place: "1st", name: tournamentResponse.first },
                    { place: "2nd", name: tournamentResponse.second},
                    ...(tournamentResponse.size > 2 ? [
                        { place: "3rd", name: tournamentResponse.third },
                        { place: "4th", name: tournamentResponse.fourth }
                    ] : [])
                ].map((player, index) => (
                    <div key={index} 
                        className="d-flex justify-content-between" 
                        style={{ 
                            width: '100%', 
                            textAlign: 'left',
                            color: index === 0 ? 'rgba(0, 150, 255, 0.8)' : 'white', 
                            fontWeight: index === 0 ? 'bold' : 'normal'
                        }}>
                        <span style={{ width: '20%' }}>{player.place || ""}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '50%', textAlign: 'center' }}>{player.name || ""}</span>
                        <span style={{ width: '20%', textAlign: 'right' }}>{player.score || " " }</span>
                    </div>
                ))}
            </div> 
            <div className="w-100 d-flex flex-direction-row align-items-center justify-content-center position-relative stats-button-container" 
                style={{ 
                    position: 'absolute', 
                    bottom: 'clamp(2%, 5%, 10%)', 
                    height: 'clamp(40px, 10vh, 80px)',
                    width: '100%',
                    padding: '0 10px',
                }}>
                <button 
                    onClick={handleClick}
                    style={{ 
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        width: 'clamp(80px, 40%, 200px)',
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <img 
                        src={star} 
                        alt="star"
                        style={{ 
                            backgroundColor: 'rgba(238, 232, 143, 0.15)', 
                            borderRadius: '30%', 
                            position: 'absolute',
                            height: '100%',
                            width: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            zIndex: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            objectFit: 'contain',
                        }} 
                    />
                    <div 
                        className="d-flex flex-column tournament-text text-center" 
                        style={{ 
                            color: 'rgba(0, 150, 255, 0.8)', 
                            fontWeight: 'bold',
                            fontSize: 'clamp(0.5rem, 1.5vw, 1rem)',
                            position: 'relative', 
                            zIndex: 1,
                            padding: '5px',
                        }}>
                        <span>{t('STATS')}</span>
                    </div>
                </button>
            </div>
        </div>
    );
}

export default ResultTournament;
