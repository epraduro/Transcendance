<h1> TRANSCENDENCE </h1>

<p align="center"> <img src="https://img.shields.io/badge/42-Project-black?style=for-the-badge&logo=42"> <img src="https://img.shields.io/badge/Backend-Django-green?style=for-the-badge&logo=django"> <img src="https://img.shields.io/badge/Frontend-JavaScript-yellow?style=for-the-badge&logo=javascript"> <img src="https://img.shields.io/badge/RealTime-WebSockets-black?style=for-the-badge"> </p>

<h2> Description </h2>

<h4> Transcendance est une application web complète développée dans le cadre du cursus 42, combinant : </h4>

•    Jeu en ligne (ici un Pong) </br>
•    Chat en temps réel </br>
•    Gestion des utilisateurs </br>
•    Authentification sécurisée </br>

<h2> Allez tester par vous même !</h2>

  [http://srv558899.hstgr.cloud:4000](https://185.97.146.220:8001/home)

  Vous pouvez utiliser le compte déjà créer

 • Nom d'utlisateur: </br>
  
    admin
 • Mot de passe: <br>
    
    Admin123?

<h4> Objectifs du projet : </h4>

•    Développer une SPA (Single Page Application) </br>
•    Implémenter un backend robuste (API REST) </br>
•    Gérer le temps réel avec WebSockets </br>
•    Mettre en place une architecture complète (frontend + backend) </br>
•    Sécuriser une application web </br>

<h2> Fonctionnalités principales </h2>

<h4> Jeu: </h4>

•    Jeu Pong en ligne </br>
•    Match en temps réel </br>
•    Multijoueur </br>
•    Gestion des scores </br>

<h4> Chat: </h4>

•    Messagerie privée </br>
•    Canaux de discussion </br>
•    Notifications en temps réel </br>

<h4> Utilisateurs: </h4>

•    Inscription / Connexion </br>
•    Profils utilisateurs </br>
•    Historique des parties </br>

<h4> Sécurité: </h4>

•    Authentification </br>
•    Gestion des sessions </br>
•    Protection des routes </br>

<h4> Contrôles: </h4>

| Touche | Action    |
| ------ | --------- |
| <p align="center"> ↑ </p> | <p align="center"> Monter  </p>  |
| <p align="center"> ↓ </p> | <p align="center"> Descendre </p>|

<h2> Architecture </h2>

📦 transcendence   </br>
┣ 📂 backend  </br>
┃ ┣ 📂 src  </br>
┃ ┃ ┣ 📂 users  </br>
┃ ┃ ┗ 📜 manage.py  </br>
┃ ┣ 📜 Dokerfile  </br>
┃ ┗ 📜 init.sh  </br>
┣ 📂 frontend  </br>
┃ ┣ 📂 core  </br>
┃ ┗ 📜 Dokerfile  </br>
┣ 📜 docker-compose.yml  </br>
┣ 📜 Makefile  </br>
┗ 📜 README.md  </br>

<h2> Installation </h2>

    git clone https://github.com/epraduro/Transcendance.git
    cd Transcendance

<h4> Lancer le projet </h4>

•    modifier l'adresse IP dans les .env puis faire:

    make

<h2> Accès au site </h2>

    https://<adresse_IP>:3000

<h2> Bonus </h2>

•    Tournois  </br>
•    2FA  </br>
•    Adversaire IA  </br>
•    Bloquer des utilisateurs (chat)  </br>

<h2> Technologies </h2>
•    Django  </br>
•    JavaScript (avec React)  </br>
•    WebSockets (custom et avec Django Channels)  </br>
•    Docker  </br>
•    PostgreSQL  </br>
