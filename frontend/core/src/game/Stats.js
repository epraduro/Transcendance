import axiosInstance from "../instance/AxiosInstance";
import './Stats.css';
import '../Home';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { useNavigate, useParams} from 'react-router-dom';
import React, { useEffect, useState } from "react";
import bronze from '../assets/game/bronze.png';
import silver from '../assets/game/silver.png';
import gold from '../assets/game/gold.png';
import { useAuth } from "../users/AuthContext";
import { useTranslation } from 'react-i18next';
import { showToast } from "../instance/ToastsInstance";

function Stats({ itemsArray = [] }) {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const [option, setOption] = useState([]);
    const [mode, setMode] = useState([]);
    const [selectedOption, setSelectedOption] = useState("");
    const [winGames, setWinGames] = useState([]);
    const [loseGames, setLoseGames] = useState([]);
    const [tournamentGames, setTournamentGames] = useState([]);
    const { id } = useParams();
    const [games, setGames] = useState([]);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [expandedTab, setExpandedTab] = useState(false);
    const [medalBronze, setMedalBronze] = useState({
        Played: false,
        Win: false,
        BestScore: false,
        BestTime: false,
    });
    const [medalSilver, setMedalSilver] = useState({
        Played: false,
        Win: false,
        BestScore: false,
        BestTime: false,
    });
    const [medalGold, setMedalGold] = useState({
        Played: false,
        Win: false,
        BestScore: false,
        BestTime: false,
    });

    const { userInfo } = useAuth();

    const medalRules = {
        Played: {
            thresholds: [10, 20, 30],
            titles: [`10 ${t('MedalPlayed')}`, `20 ${t('MedalPlayed')}`, `30 ${t('MedalPlayed')}`]
        },
        Win: {
            thresholds: [5, 10, 15],
            titles: [`5 ${t('MedalWin')}`, `10 ${t('MedalWin')}`, `15 ${t('MedalWin')}`]
        },
        BestScore: {
            thresholds: [5, 10, 15],
            titles: [`5 ${t('MedalWonMax')}`, `10 ${t('MedalWonMax')}`, `15 ${t('MedalWonMax')}`]
        },
        BestTime: {
            thresholds: [5, 10, 15],
            titles: [`5 ${t('MedalTime')}`, `10 ${t('MedalTime')}`, `15 ${t('MedalTime')}`]
        }
    };

    const setupMedals = (gamesArray, nameMedal, bronze, silver, gold) => {
        if (Array.isArray(gamesArray)) {
            if (gamesArray.length >= bronze) {
                setMedalBronze(prev => ({ ...prev, [nameMedal]: true }));
            }
            if (gamesArray.length >= silver) {
                setMedalSilver(prev => ({ ...prev, [nameMedal]: true }));
            }
            if (gamesArray.length >= gold) {
                setMedalGold(prev => ({ ...prev, [nameMedal]: true }));
            }
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 1115);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);


    useEffect(() => {
        if (games.length > 0 && userInfo) {
            const winGamesFiltered = games.filter(game => game.winner === userInfo?.name);
            const loseGamesFiltered = games.filter(game => game.loser === userInfo?.name);
            
            if (winGamesFiltered)
                setWinGames(winGamesFiltered);
            if (loseGamesFiltered)
                setLoseGames(loseGamesFiltered);

            setupMedals(games, "Played", 10, 20, 30);
            setupMedals(winGames, "Win", 5, 10, 15);


            const BestScoreFiltered = winGames.filter(score => 
                (score.player2 === userInfo?.name && score.score_player_2 === 11) || 
                (score.player1 === userInfo?.name && score.score_player_1 === 11)
            );
            setupMedals(BestScoreFiltered, "BestScore", 5, 10, 15);

            const BestTimeFiltered = winGames.filter(time => time.timeMinutes > 1);
            setupMedals(BestTimeFiltered, "BestTime", 5, 10, 15);
        }
    }, [games, id, userInfo]);
    
    const handleDivClick = (name) => {
        if(name !== "")
        {
                setMode(prevMode => 
                prevMode.map(mode => ({
                    ...mode,
                    active: mode.name === name ? !mode.active : false 
                }))
            );
        }
        else
        {
            setExpandedTab(prev => !prev);
        }
    };

    const handlChoiceOption = (name) => {
        setOption(prevOption =>
            prevOption.map(option => ({
                ...option,
                active: option.name === name ? !option.active : false
            }))
        );
        setSelectedOption((prevSelected) => (prevSelected === name ? "" : name));
    };
    
    useEffect(() => {
    
        const filteredModes = itemsArray
            .filter(itemsArray => ['profile', 'collect', 'global'].includes(itemsArray.name))
            .map(itemsArray => ({
                name: itemsArray.name,
                active: itemsArray.active || false,
            }));
        setMode(filteredModes);
    
        const filteredOptions = itemsArray
            .filter(itemsArray => ['All games', 'Tournament', 'Win', 'Lose'].includes(itemsArray.name))
            .map(itemsArray => ({
                name: itemsArray.name,
                active: itemsArray.active || false,
            }));
        setOption(filteredOptions);
    }, [itemsArray]);

    useEffect(() => {
        const activeOption = option.find(option => option.active);
        setSelectedOption(activeOption || null);
    }, [option]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axiosInstance.get(`/api/game/fetch_data_user/${userInfo?.id}/`, {}); 
                setGames(response.data);
            } catch (error) {
                showToast("error", t('ToastsError'));
            }
        };
        const fetchTournament = async () => { 
            try {
                const response = await axiosInstance.get(`/api/game/fetch_data_tournament_by_user/${userInfo?.id}/`, {});
                setTournamentGames(response.data);
            } catch (error) {
                showToast("error", t('ToastsError'));
            }
        };
        if (userInfo?.id) {
            fetchStats();
            fetchTournament();
        }
        }, [!games.length, userInfo?.id]);
    
    const getOtherPlayers = (data) => {
        const allPlayers = [data.player1, data.player2, data.player3, data.player4].filter(Boolean);
        return allPlayers.filter(player => player !== userInfo?.name).join(', ') || 'N/A';
    };

      function StatsTable({ data, expandedTab }) {
        return (
            <div className="stats-zone-table w-100 h-100">
                <div className="w-100 d-flex">
                    <table style={{ width: "100%", tableLayout: "relative", overflow: "hidden", zIndex: "12", pointerEvent:'cursor' }} >
                        <thead>
                            <tr>
                                <th
                                    title={isSmallScreen ? t('Date') : ""}
                                >{t('Date')}</th>
                                <th
                                    title={isSmallScreen ? t('Against') : ""}
                                >{t('Against')}</th>
                                <th
                                    title={isSmallScreen ? t('Time') : ""}
                                >{t('Time')}</th>
                                <th
                                    title={isSmallScreen ? t('Score') : ""}
                                >{t('Score')}</th>
                                <th
                                    title={isSmallScreen ? t('Result') : ""}
                                >{t('Result')}</th>
                            </tr>
                        </thead>  
                            <tbody>
                                {data.map((data) => (
                                    <tr key={data.id}>
                                      <td 
                                            title={`${data.date ? data.date.slice(-5) : "N/A"}-${data.date ? data.date.slice(0, 4) : "N/A"}`}
                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                            className={expandedTab ? 'expanded-cell' : ''}
                                        >
                                            {data.date ? data.date.slice(-5) : "N/A"}-{data.date ? data.date.slice(0, 4) : "N/A"}
                                        </td>
                                        <td 
                                            title={getOtherPlayers(data)}
                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                            className={expandedTab ? 'expanded-cell' : ''}
                                        >
                                            {getOtherPlayers(data)}
                                        </td>
                                        <td
                                            title={isSmallScreen ? data.timeMinutes + " : " + data.timeSeconds : ""}
                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                            className={expandedTab ? 'expanded-cell' : ''}
                                        >{data.timeMinutes} : {data.timeSeconds}</td>
                                        <td
                                           title={isSmallScreen ? `${data.score_player_1} - ${data.score_player_2}` : ""}
                                           onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                           className={expandedTab ? 'expanded-cell' : ''}
                                        >
                                            {data.score_player_1} - {data.score_player_2}
                                        </td>
                                        <td
                                            title={isSmallScreen ? data.winner === userInfo?.name ? t('win') : data.loser === userInfo?.name ? "lose" : "N/A" : ""}
                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                            className={expandedTab ? 'expanded-cell' : ''}
                                        >
                                            {data.winner === userInfo?.name ? t('win') :
                                            data.loser === userInfo?.name ? t('lose') : "N/A"}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
    
    
    return (
            <div  className="stats-home h-100 w-100 d-flex flex-reverse">
                <div className="stats-element one h-100 w-50">
                <div className="stats-row h-50 w-100" onClick={() => handleDivClick('profile')}>
                    <div className={`stats-zone ${mode.find(mode => mode.name === 'profile')?.active ? 'expanded left' : ''} left d-flex flex-reverse`}>
                        <div className="stats-zone-content d-flex flex-column flex-md-row w-100 h-100">
                        <div 
                            className="stats-col d-flex flex-column h-100 w-50"
                            style={{ 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '15px'
                            }}
                            >
                            <div 
                                className="stats-row-element empty-row d-flex justify-content-center align-items-center" 
                                style={{
                                    height: '34%',
                                    width: '100%',
                                    marginTop: '5%'
                                }}
                            >
                                    <img
                                        src={userInfo?.profile_image_url ? `${process.env.REACT_APP_API_URL}${userInfo?.profile_image_url}` : '/default.png'}
                                        alt="Profile"
                                        className="profile-picture img-fluid"
                                        title="profile"
                                        onClick={(e) => { e.stopPropagation(); navigate("/Home", { state: { modalName: "profile" } }); }}
                                        style={{
                                            width: mode.find(mode => mode.name === 'profile')?.active ? '50%' : '70%',
                                            height: 'auto',
                                            objectFit: 'cover'
                                        }}
                                    />
                            </div>
                            <div className="stats-row-element empty-row flex-grow-1" style={{ height: "12%", display: "flex", alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{userInfo?.name}</div>
                            <div className="stats-row-element d-flex flex-grow-1" style={{height: `30%`, alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                            <div className="text-center">
                                <div className="stats-text">{t('WinrateRatio')}</div>
                                    <div className="counter">
                                        {games?.length && winGames?.length 
                                        ? Math.round((winGames?.length / games?.length) * 100) + "%"
                                        : "0%"
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="stats-col d-flex flex-column w-50" style={{  height: '100%', justifyContent:'space-between', alignItems:'center'}}>
                            <div className="stats-row-element flex-grow-1 w-100">
                            <div className="text-center">
                                <div className="stats-text">{t('GamesPlayed')}</div>
                                <div className="counter">{games?.length || "0"}</div>
                            </div>
                            </div>
                            <div className="stats-row-element flex-grow-1 w-100">
                            <div className="text-center">
                                <div className="stats-text">{t('Win')}</div>
                                <div className="counter">{winGames?.length || "0"}</div>
                            </div>
                            </div>
                            <div className="stats-row-element flex-grow-1 w-100">
                            <div className="text-center">
                                <div className="stats-text">{t('Lose')}</div>
                                <div className="counter">{loseGames?.length || "0"} </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div className="stats-row h-50 w-100"  onClick={() => handleDivClick('collect')}>
                        <div className={`stats-zone ${mode.find(mode => mode.name === 'collect')?.active ? 'expanded left' : ''} collect left d-flex flex-reverse`}> 
                            <div
                                className="d-flex h-100 w-100 flex-column"
                                style={{
                                    padding: '5%',
                                    position: 'relative',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    display: 'flex',
                                }}
                                >
                                <div
                                    style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    }}
                                ></div>
                                {[
                                    { key: "Played" },
                                    { key: "Win" },
                                    { key: "BestScore" },
                                    { key: "BestTime" }
                                    ].map((medal, index) => (
                                    <div key={index} className="d-flex row w-100 mb-2" style={{ flex: '1', height: '20%', paddingTop: '2%' }}>                                        
                                    <div className="h-100 d-flex justify-content-center align-items-center" style={{ width: '33.3%', flex: '1' }}>
                                        <img
                                                src={bronze}
                                                style={{ height: '100%', width: 'auto', zIndex:'0', opacity: medalBronze[medal.key] ? 1 : 0.5 }}
                                                title={medalRules[medal.key].titles[0]}
                                            />
                                        </div>
                                        <div className="h-100 d-flex justify-content-center align-items-center" style={{ width: '33.3%', flex: '1' }}>
                                            <img
                                                src={silver}
                                                style={{ height: '100%', width: 'auto', zIndex:'0', opacity: medalSilver[medal.key] ? 1 : 0.5 }}
                                                title={medalRules[medal.key].titles[1]}
                                            />
                                        </div>
                                        <div className="h-100 d-flex justify-content-center align-items-center" style={{ width: '33.3%', flex: '1' }}>
                                            <img
                                                src={gold}
                                                style={{ height: '100%', width: 'auto', zIndex:'0', opacity: medalGold[medal.key] ? 1 : 0.5 }}
                                                title={medalRules[medal.key].titles[2]}
                                            />
                                            
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="stats-row two d-flex h-100 w-50"  onClick={() => handleDivClick('global')}>
                    <div 
                        className={`stats-zone ${mode.find(mode => mode.name === 'global')?.active ? 'expanded right' : ''} right d-flex flex-column`}>
                        <div className="dropdown-stats btn-group" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="btn btn-dropdown-stats">
                                {t(selectedOption && selectedOption.name ? selectedOption.name.replace(/\s/g, "") : "defaultKey")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-dropdown-stats dropdown-toggle dropdown-toggle-split"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <span className="visually-hidden">{t('ToggleDropdown')}</span>
                            </button>
                            <ul
                                className="dropdown-stats-menu dropdown-menu custom-dropdown-menu w-100" 
                                onClick={(e) => e.stopPropagation()} 
                            >
                                {option.map((option) => (
                                    <li key={option.name}>
                                        <a
                                            className={`dropdown-item ${option.active ? "active" : ""}`}
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlChoiceOption(option.name);
                                                e.target.closest(".dropdown-menu").classList.remove("show");
                                            }}
                                        >
                                            {t(option.name.replace(/\s/g, ""))}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {option.find(option => option.name === 'All games')?.active && (
                            <StatsTable data={games} expandedTab={expandedTab}/>
                        )}
                        {option.find(option => option.name === 'Win')?.active && (
                            <StatsTable data={winGames} expandedTab={expandedTab}/>
                        )}
                        {option.find(option => option.name === 'Lose')?.active && (
                            <StatsTable data={loseGames} expandedTab={expandedTab}/>
                        )}
                        {option.find(option => option.name === 'Tournament')?.active && (
                            <>
                
                                <div className="stats-zone-table w-100 h-100">
                                    <div className="w-100 d-flex">
                                        <table style={{ width: "100%", tableLayout: "relative", overflow: "hidden" }}>
                                            <thead>
                                                <tr>
                                                    <th>{t('Date')}</th>
                                                    <th>{t('Code')}</th>
                                                    <th>{t('Time')}</th>
                                                    <th>{t('Place')}</th>
                                                    <th>{t('Classement')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tournamentGames.map((game) => (
                                                    <tr key={game.id}>
                                                        <td
                                                            title={game.date || 'N/A'}
                                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                                            className={expandedTab ? 'expanded-cell' : ''}
                                                        >{game.date || "N/A"}</td>
                                                        <td
                                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                                            className={expandedTab ? 'expanded-cell' : ''}
                                                        >{game.code || "N/A"}</td>
                                                        <td
                                                             onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                                             className={expandedTab ? 'expanded-cell' : ''}
                                                        >{game.timeMaxMinutes} : {game.timeMaxSeconds}</td>
                                                        <td
                                                             onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                                             className={expandedTab ? 'expanded-cell' : ''}
                                                        >{(() => {
                                                            if (game.first === userInfo?.name) return t('1st');
                                                            if (game.second === userInfo?.name) return t('2nd');
                                                            if (game.third === userInfo?.name) return t('3rd');
                                                            if (game.fourth === userInfo?.name) return t('4th');
                                                            return "N/A";
                                                        })() || "N/A"}</td>
                                                        <td
                                                            onClick={(e) => { e.stopPropagation(); handleDivClick(""); }} 
                                                            className={expandedTab ? 'expanded-cell' : ''}
                                                        > 
                                                        <div className="d-flex flex-direction row w-100" style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}> 1 : {game.first || "N/A"} </div>
                                                        <div className="d-flex flex-direction row w-100" style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}> 2 : {game.second || "N/A"} </div>
                                                        {game.third && game.third !== game.first && game.third !== game.second && (
                                                            <div className="d-flex flex-direction row w-100" style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                                                                3 : {game.third}
                                                            </div>
                                                        )}
                                                        {game.fourth && game.fourth !== game.first && game.fourth !== game.second && (
                                                            <div className="d-flex flex-direction row w-100" style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                                                                4 : {game.fourth}
                                                            </div>
                                                        )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
        </div>
    )

}

export default Stats;