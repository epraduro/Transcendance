import React, { useRef, useState } from 'react';
import logo from '../assets/user/logo.png';
import './Template.css';
import { useAuth } from '../users/AuthContext';
import LiveDateTime from './DateInstance';
import social from '../assets/user/friends.svg'; 
import { useLocation, useNavigate } from 'react-router-dom';
import home from '../assets/home.svg'
import info from '../assets/info.svg'
import profile from '../assets/profile.svg'
import power from '../assets/power.svg'

import { useTranslation } from 'react-i18next';

function Template({ children, taskBarContent, launching, appArray }) {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const [isDesktop, setIsDesktop] = useState(false);
    const { isAuthenticated } = useAuth();
    const desktopRef = useRef(null);
    const [isCreditOn, setIsCredit] = useState(false);

    const { t } = useTranslation();

    const changeLang = (lang) => {
        localStorage.setItem("lang", lang);
        i18n.changeLanguage(lang);
    }

    const toggleDesktop = () => {
        setIsDesktop((prev) => !prev);
    };

    const handleClickOutside = (e) => {
        if (desktopRef.current && !desktopRef.current.contains(e.target) && 
            e.target.className !== 'logo') {
            setIsDesktop(false);
        }
    };

    const handleClick= (modalName) =>
    {
        const app = appArray?.find((item) => item.name === modalName);

        if (!app) return;
        app.setter(prev => !prev);

        launching({newLaunch: modalName, setModal: app.setter});
        setIsDesktop(false);
    }

    const handleInfoClick = (e) => {
        e.stopPropagation();
        setIsCredit(true);
    };

    return (
        <div className="general container-fluid">
            {isCreditOn ? (
                    <div className="h-100 w-100 d-flex" style={{zIndex:'1', backgroundColor:'black', position:'absolute', color: 'white', padding: '5%', overflowY:'auto'}}>
                        <table style={{ width: "100%", tableLayout: "relative", overflow: "hidden", zIndex: "12", pointerEvent:'cursor', alignItems: 'center', textAlign:'center' }} >
                            <thead style={{fontSize: '2rem'}}>
                                <tr>
                                    <th
                                        title={t('image')}
                                    >{t('Image')}</th>
                                    <th
                                        title={t('source')}
                                    >{t('Source')}</th>
                                </tr>
                            </thead>  
                                <tbody>
                                    <tr>
                                        <td>background-collect</td>
                                        <td>iStock</td>
                                    </tr>
                                    <tr>
                                        <td>block, blockAfter </td>
                                        <td>hiclipart</td>
                                    </tr>
                                    <tr>
                                        <td>mario-init, mario-jump, mario-run-1, mario-run-2 </td>
                                        <td>fandom</td>
                                    </tr>
                                    <tr>
                                        <td>ghost2, ghost3, piece </td>
                                        <td>pngegg</td>
                                    </tr>
                                    <tr>
                                        <td>pacman </td>
                                        <td>wallpapers</td>
                                    </tr>
                                    <tr>
                                        <td>person, person-fill, power, innfo, home, profile, check, edit, friends, gear, x </td>
                                        <td>boostrap</td>
                                    </tr>
                                    <tr>
                                        <td>bronze, silver, gold </td>
                                        <td>flaticon</td>
                                    </tr>
                                    <tr>
                                        <td>EXIT </td>
                                        <td>vecteezy</td>
                                    </tr>
                                    <tr>
                                        <td>1prize, 2prize, 3prize </td>
                                        <td>CleanPNG</td>
                                    </tr>
                                    <tr>
                                        <td>loading </td>
                                        <td>Gifer</td>
                                    </tr>
                                    <tr>
                                        <td>waiting </td>
                                        <td>icon8</td>
                                    </tr>    
                                    <tr>
                                        <td>logo </td>
                                        <td>42.fr</td>
                                    </tr>  
                            </tbody>
                        </table>
                    </div>
                ) : null}
            <div className="content-area" onClick={handleClickOutside}>{children}</div>
            <div className="task-bar">
                <div className='left-task'>
                    <img
                        src={logo}
                        alt="logo"
                        className="logo"
                        onClick={toggleDesktop}
                    />
                </div>
                <div className="border-start border-2 border-black border-opacity-25 h-75"></div>          
                {isDesktop && (
                    <div className="desktop-overlay" ref={desktopRef}>
                        <div className="desktop-content" onClick={() => setIsCredit(false)}>
                            <div className="application-desktop d-flex flex-column bd-highlight mb-3">
                                {!isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => navigate("/home", {state: { modalName: "terminal"}})} 
                                >
                                    {t('Terminal')}
                                </div>}
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => navigate("/home", {state: { modalName: "game"}})}
                                >
                                    {t('Game')}
                                </div>}
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => navigate("/Chat")}
                                >
                                    {t('Chat')}
                                </div>}
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => navigate("/home", {state: { modalName: "stats"}})}
                                >
                                    {t('Stats')}
                                </div>}
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => changeLang('en')}
                                >
                                    🇬🇧
                                </div>
                                }
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => changeLang('fr')}
                                >
                                    🇫🇷
                                </div>
                                }
                                {isAuthenticated && <div
                                    className="p-2 bd-highlight flex-item"
                                    onClick={() => changeLang('it')}
                                >
                                    🇮🇹
                                </div>
                                }
                                {isAuthenticated && 
                                    <>
                                    <div className="template-icons w-100" style={{ position: 'absolute', left:'0%', height:'10%' }}>
                                        <img src={info} alt="info" title="Credits" style={{ width: '24px', height: '24px', cursor: 'pointer', margin:'2%' }} onClick={handleInfoClick}/>
                                        <img src={profile} alt="Profile" title="Profile" style={{ width: '24px', height: '24px', cursor: 'pointer', margin:'2%' }} onClick={() => navigate("/home", { state: { modalName: "profile" } })} />
                                        <img src={home} alt="Home" title="Home" style={{ width: '24px', cursor: 'pointer', margin:'2%' }} onClick={() => navigate("/home")} />
                                        <img src={power} alt="Power" title="logout" style={{ width: '24px', height: '24px', cursor: 'pointer', margin:'2%'}} onClick={() => navigate("/logout")} />
                                    </div>
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                )}

                {taskBarContent}
                <div className='right-task'>
                    {<img
                        src={social}
                        alt="social"
                        className="social-icon"
                        onClick={() => navigate("/home", {state: { modalName: "social"}})}
                    />}
                    <div className='date-task'>
                        <LiveDateTime />
                    </div>
                </div>  
            </div>
        </div>
    );
}

export default Template;

