from channels.db import database_sync_to_async
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.exceptions import MultipleObjectsReturned
from .models import Game, Tournament
from users.models import User
import random
import asyncio
import time
from channels.layers import get_channel_layer
import jwt
import os
from django.shortcuts import get_object_or_404


class TournamentConsumer(AsyncWebsocketConsumer):
    tournament_states = {}
    tournament = {}
    processed_messages = set()
    tournament_locks = {} 

    def __init__(self):  
            self.groups = []
            self.tournament_code = None
            self.token = None
            self.user = None
            self.group_name = None

    async def connect(self):
        self.tournament_code = self.scope['url_route']['kwargs']['tournament_code']
        self.token = self.scope['cookies'].get('token')
        self.user = await self.authenticate_user(self.token)
        if self.tournament_code not in TournamentConsumer.tournament_locks:
            TournamentConsumer.tournament_locks[self.tournament_code] = asyncio.Lock()
        async with TournamentConsumer.tournament_locks[self.tournament_code]: 
            tournament = await self.get_tournament(self.tournament_code)
            if tournament.status == "ready" and not self.user.name in [tournament.player1, tournament.player2, tournament.player3, tournament.player4]:
                await self.accept()
                await self.send(text_data=json.dumps({
                    'full': True,
                }))
                return
            if tournament:
                TournamentConsumer.tournament[self.tournament_code] = tournament
            else:
                await self.close()
                return
            self.group_name = f'tournament_{self.tournament_code}'
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            if not self.user:
                await self.close()
                return
            if self.user.name in [tournament.player1, tournament.player2, tournament.player3, tournament.player4]:
                game_group = f"game_{self.tournament_code}"
                await self.channel_layer.group_add(game_group, self.channel_name)
                await self.accept()
                await self.save_tournament(tournament)
                await self.send_user_connected_message()
                await self.change_user_connection(True)
                await self.change_tournament_status(tournament, "ready")
                return
            else:
                if tournament.status == 'waiting':
                    await self.accept()
                    await self.add_user_to_tournament()
                    await self.send_user_connected_message()
                    game_group = f"game_{self.tournament_code}"
                    await self.channel_layer.group_add(game_group, self.channel_name)
                    if self.tournament_code not in TournamentConsumer.tournament_states:
                        TournamentConsumer.tournament_states[self.tournament_code] = {"games_finished": 0}
                    


    @database_sync_to_async
    def remove_user_to_tournament(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament:
            tournament.players_connected -= 1
            if tournament.player1 and  self.user.name == tournament.player1:
                tournament.player1 = ""
            elif tournament.player2 and  self.user.name == tournament.player2:
                tournament.player2 = ""
            elif tournament.player3 and  self.user.name == tournament.player3:
                tournament.player3 = ""
            elif tournament.player4 and  self.user.name == tournament.player4:
                tournament.player4 = ""
            tournament.save()


    async def disconnect(self, close_code):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)           
        if tournament.status == "waiting":
            async with TournamentConsumer.tournament_locks[self.tournament_code]:
                await self.remove_user_to_tournament()
                await self.send_user_connected_message()
        if self.group_name:
            await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        await self.change_user_connection(False)
        if tournament.status != "in_Game":
            await self.abort_tournament()

    @database_sync_to_async
    def fetch_nbr_games(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament: 
            count = tournament.gamesTournament.count()
            return count
        return 0
    
    @database_sync_to_async
    def change_tournament_status(self, tournament, newStatus):
        tournament.status = newStatus
        tournament.save()

    @database_sync_to_async
    def add_user_to_tournament(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament:
            if not tournament.player1:
                tournament.player1 = self.user.name
                tournament.player1co = True
            elif not tournament.player2:
                tournament.player2 = self.user.name
                tournament.player2co = True
            elif not tournament.player3:
                tournament.player3 = self.user.name
                tournament.player3co = True
            elif not tournament.player4:
                tournament.player4 = self.user.name
                tournament.player4co = True
            tournament.players_connected += 1

            if tournament.players_connected == tournament.size:
                tournament.status = "ready"
            tournament.save()

    @database_sync_to_async
    def change_user_connection(self, newConnection):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament:
            if tournament.player1 == self.user.name:
                tournament.player1co = newConnection
            elif tournament.player2 == self.user.name:
                tournament.player2co = newConnection
            elif tournament.player3 == self.user.name:
                tournament.player3co = newConnection
            elif tournament.player4 == self.user.name:
                tournament.player4co = newConnection
            tournament.save()



    @database_sync_to_async
    def save_tournament(self, tournament):
        try:
            tournament.save()
        except Exception as e:
            print(f"Error saving game: {e}")
    async def send_user_connected_message(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament:
            message = {
                'type': 'user_connected',
                'username': self.user.name,
                'players_connected': tournament.players_connected,
                'code': self.tournament_code,
            }

            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'user_connected_message',
                    'message': message
                }
            )

    async def Timer(self, event):
        await self.send(text_data=json.dumps(event))

    async def tournament_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_connected_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def start_game(self, game_id, player1, player2, gameStatus):
        group_name = f"game_{self.tournament_code}"
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "game_update",
                "game_id": game_id,
                "player1" : player1,
                "player2" : player2,
                "gameStatus" : gameStatus,
            }
        )
    @database_sync_to_async
    def add_to_user(self, tournament):
        if tournament.player1:
            player1_user = get_object_or_404(User, name=tournament.player1)
            player1_user.tournament.add(tournament)
            player1_user.save()
        if tournament.player2:
            player2_user = get_object_or_404(User, name=tournament.player2)
            player2_user.tournament.add(tournament)
            player2_user.save()
        if tournament.player3:
            player3_user = get_object_or_404(User, name=tournament.player3)
            player3_user.tournament.add(tournament)
            player3_user.save()
        if tournament.player4:
            player4_user = get_object_or_404(User, name=tournament.player4)
            player4_user.tournament.add(tournament)
            player4_user.save()


    async def start_first_match(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        await self.add_to_user(tournament)
        if tournament:
            await self.change_tournament_status(tournament, "in_Game")
            if tournament.size == 2 and tournament.players_connected == 2:
                if tournament.player1 and tournament.player2:
                    game_data_1 = await self.create_Game_Multi(
                        self.token, tournament.player1, tournament.player2
                    )
                    if game_data_1:
                        await self.start_game(game_data_1['id'], tournament.player1, tournament.player2, "match")
                    else:
                        await self.abort_tournament()
            if tournament.size == 4 and tournament.players_connected == 4:
                if tournament.player1 and tournament.player2:
                    game_data_1 = await self.create_Game_Multi(
                            self.token, tournament.player1, tournament.player2
                    )
                    if game_data_1:
                        await self.start_game(game_data_1['id'], tournament.player1, tournament.player2, "match")
                    else:
                        await self.abort_tournament()
                if tournament.player3 and tournament.player4:
                    game_data_2 = await self.create_Game_Multi(
                        self.token, tournament.player3, tournament.player4
                    )
                    if game_data_2:
                        await self.start_game(game_data_2['id'], tournament.player3, tournament.player4, "match")
                    else:
                        await self.abort_tournament()

    async def start_finale(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if tournament:
            if tournament.winner1 and tournament.winner2:
                final_game_data = await self.create_Game_Multi(self.token, tournament.winner1, tournament.winner2)
                if final_game_data:
                    await self.start_game(final_game_data['id'], tournament.winner1, tournament.winner2, "finale")


    async def abort_tournament(self):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        await self.change_tournament_status(tournament, "aborted")
        group_name = f"game_{self.tournament_code}"
        await self.channel_layer.group_send(
            group_name,
            {
                "type": "tournament_update",
                "tournament_status": tournament.status,
            }
        )

    async def receive(self, text_data):
        try:
            data_dict = json.loads(text_data)
        except json.JSONDecodeError:
            return
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        if "message" in data_dict:
            if tournament.winner_final != "":
                await self.change_tournament_status(tournament, "finished")
            await self.send_user_connected_message()
        if "Abort" in data_dict:
            if tournament.status != "waiting":
                await self.abort_tournament()
        if "Start" in data_dict:
            if tournament:
                async with TournamentConsumer.tournament_locks[self.tournament_code]:
                    if tournament.status != "Timer" and tournament.status != "in_Game":
                        await self.change_tournament_status(tournament ,"Timer")
                        if tournament.players_connected == 2 and tournament.size == 2 and await self.fetch_nbr_games() < 3:
                            await self.start_first_match()
                        if tournament.players_connected == 4 and tournament.size == 4 and await self.fetch_nbr_games() < 2:
                            await self.start_first_match()
                        if tournament.players_connected == 4 and tournament.size == 4 and await self.fetch_nbr_games() == 2:
                            await self.start_finale()
        if "Timer" in data_dict:
            if tournament:
                await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "Timer",
                    "startTimer": True,
                }
        )


    @database_sync_to_async
    def create_game_directly(self, player1, player2, timeSeconds, timeMinutes, scoreMax, tournamentCode):
        try:
            game = Game.objects.create(
                player1=player1,
                player2=player2,
                isInTournament=True,
                timeSeconds=timeSeconds,
                timeMinutes=timeMinutes,
                scoreMax=scoreMax,
                tournamentCode=tournamentCode
            )

            TournamentConsumer.tournament[self.tournament_code].gamesTournament.add(game)
            return {
                'id': game.id,
                'player1': game.player1,
                'player2': game.player2,
            }
        except Exception as e:
            return None

    async def create_Game_Multi(self, token, player1, player2):
        tournament = TournamentConsumer.tournament.get(self.tournament_code)
        timeSeconds = tournament.timeMaxSeconds 
        timeMinutes = tournament.timeMaxMinutes
        scoreMax = tournament.scoreMax
        if tournament.size == 2:
            if tournament.player1co == False or tournament.player2co == False:
                return None
            game_data = await self.create_game_directly(player1, player2, timeSeconds, timeMinutes, scoreMax,self.tournament_code)
            if game_data:
                return game_data
            else:
                return None
        elif tournament.size == 4:
            if tournament.player1co == False or tournament.player2co == False or tournament.player3co == False or tournament.player4co == False:
                return None
            game_data = await self.create_game_directly(player1, player2, timeSeconds, timeMinutes, scoreMax,self.tournament_code)
            if game_data:
                return game_data
            else:
                return None
        else:
            return None

            
    async def authenticate_user(self, token):
        try:
            payload = jwt.decode(token, os.getenv('JWT_KEY'), algorithms=["HS256"])
            user_id = payload.get('id')
            if user_id:
                user = await self.get_user_from_id(user_id)
                if user:
                    return user
            return None
        except jwt.ExpiredSignatureError:
            print("Token expired")
        except jwt.InvalidTokenError:
            print("Invalid token")
        return None
    
    @database_sync_to_async
    def get_user_from_id(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_tournament(self, tournament_code):
        try:
            tournaments = Tournament.objects.filter(code=tournament_code)
            
            if tournaments.count() > 1:
                raise MultipleObjectsReturned(f"More than one tournament found with the code: {tournament_code}")
            
            if tournaments.exists():
                return tournaments.first()
            else:
                return None

        except MultipleObjectsReturned as e:
            return None
        except Exception as e:
            return None

matchmaking_queue = []

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token = self.scope['cookies'].get('token')
        if token:
            user = await self.authenticate_user(token)
            if user:
                self.user = user
                self.user.auth_token = token
                await self.accept()
            else:
                await self.close()
        else:
            await self.close()

    async def disconnect(self, close_code):
        global matchmaking_queue
        if self.channel_name in matchmaking_queue:
            matchmaking_queue.remove(self.channel_name)

    async def receive(self, text_data):
        global matchmaking_queue
        text_data_json = json.loads(text_data)

        if text_data_json.get("type") == "join":
            matchmaking_queue.append({
                'player_name': self.user,
                'channel_name': self.channel_name
            })

            gameData = None
            if len(matchmaking_queue) >= 2: 
                player1 = matchmaking_queue.pop(0)
                player2 = matchmaking_queue.pop(0)
                if player1['player_name'] != player2['player_name']:
                    gameData = await self.create_Game_Multi(player1['player_name'], player2['player_name'])
                else:
                    matchmaking_queue.append({
                    'player_name': self.user,
                    'channel_name': self.channel_name
                })
            if gameData:
                game_id = gameData['id']
                await self.start_game(game_id, player1['channel_name'], player2['channel_name'])
        if text_data_json.get("type") == "leave":
            if (len(matchmaking_queue) >= 1):
                matchmaking_queue = [player for player in matchmaking_queue if player['player_name'] != self.user]

    @database_sync_to_async
    def get_user_from_id(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def authenticate_user(self, token):
        try:
            payload = jwt.decode(token, os.getenv('JWT_KEY'), algorithms=["HS256"])
            user_id = payload.get('id')
            if user_id:
                user = await self.get_user_from_id(user_id)
                if user:
                    return user
            return None
        except jwt.ExpiredSignatureError:
            print("Token expired")
        except jwt.InvalidTokenError:
            print("Invalid token")
        return None
    
    @database_sync_to_async
    def get_user_from_id(self, user_id):
        from users.models import User
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def create_game_directly(self, player1, player2):
        try:
            game = Game.objects.create(
                player1=player1,
                player2=player2,
            )
            
            player1_object = User.objects.get(name=player1) 
            player2_object = User.objects.get(name=player2)
    
            player1_object.games.add(game)
            player2_object.games.add(game)

            player1_object.save()
            player2_object.save()

            return {
                'id': game.id,
                'player1': game.player1,
                'player2': game.player2,
            }
            
        except Exception as e:
            return None

    async def create_Game_Multi(self, player1, player2):
        game_data = await self.create_game_directly(player1, player2)
        if game_data:
            return game_data
        else:
            return None

    async def game_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def start_game(self, game_id, player1, player2):
        await self.channel_layer.send(player1, {
            "type": "game_update", 
            "game_id": game_id,
        })
        await self.channel_layer.send(player2, {
            "type": "game_update",
            "game_id": game_id,
        })
        group_name = f"game_{game_id}"
        await self.channel_layer.group_add(group_name, player1)
        await self.channel_layer.group_add(group_name, player2)

class GameState:
    def __init__(self, game):
        self.timer = {
            "seconds": game.timeSeconds,
            "minutes": game.timeMinutes,
        }
        self.paddle_data = {
            "paddleRightY": 826 / 2 - 170 / 3,
            "paddleLeftY": 826 / 2 - 170 / 3,
            "paddleRightX": 1536 * 0.95 - 17,
            "paddleLeftX": 1536 * 0.05,
            "width": 17,
            "height": 170,
            "height_canvas": 826,
            "width_canvas": 1536
        }

        self.pong_data = {
            "pos_x": 1536 / 2,
            "pos_y": 826 / 2,
            "width": 20,
            "velocity_x": 6,
            "velocity_y": 6
        }

        self.score = {
            "score_P1": 0,
            "score_P2": 0
        }
        self.winner = None
        self.loser = None
        self.player1 = game.player1
        self.player2 = game.player2
        self.eloPlayer1 = game.elo_Player1
        self.eloPlayer2 = game.elo_Player2
        self.isInTournament = game.isInTournament
        self.code = game.tournamentCode
        self.IA_active = game.IA
        self.IA_timer = 0
        self.IA_last_timer = 0
        self.IA_up = False
        self.IA_down = False
        self.gamerunning = False
        self.status = "started"
        self.IA_pos_y = 0

    def is_game_over(self, game):
        if self.status == "aborted":
            return True
        if self.score["score_P1"] >= game.scoreMax:
            self.winner = self.player1
            self.loser = self.player2
            self.status = "finished"
            return True
        elif self.score["score_P2"] >= game.scoreMax:
            self.winner = self.player2
            self.loser = self.player1
            self.status = "finished"
            return True
        if self.timer["minutes"] == 0 and self.timer["seconds"] == 0:
            if self.score["score_P1"] > self.score["score_P2"]:
                self.winner = self.player1
                self.loser = self.player2
            else:
                self.winner = self.player2
                self.loser = self.player1
            self.status = "finished"
            return True
        return False
    
    def update(self):
        self.pong_data["pos_x"] += self.pong_data["velocity_x"]
        self.pong_data["pos_y"] += self.pong_data["velocity_y"]
        if self.pong_data["pos_x"] <= 0:
            self.score["score_P2"] += 1
            self.reset_ball(direction=1)
            return

        elif self.pong_data["pos_x"] >= self.paddle_data["width_canvas"]:
            self.score["score_P1"] += 1
            self.reset_ball(direction=-1)
            return
        
        if self.pong_data["pos_y"] <= 0 or self.pong_data["pos_y"] >= self.paddle_data["height_canvas"]:
            self.pong_data["velocity_y"] *= -1

        ball_left = self.pong_data["pos_x"] - self.pong_data["width"] / 2
        ball_right = self.pong_data["pos_x"] + self.pong_data["width"] / 2
        ball_top = self.pong_data["pos_y"] - self.pong_data["width"] / 2
        ball_bottom = self.pong_data["pos_y"] + self.pong_data["width"] / 2

        if (ball_right > self.paddle_data["paddleLeftX"] and 
            ball_left < self.paddle_data["paddleLeftX"] + self.paddle_data["width"] and 
            ball_bottom > self.paddle_data["paddleLeftY"] and 
            ball_top < self.paddle_data["paddleLeftY"] + self.paddle_data["height"]):

            if (
                self.pong_data["pos_x"] <= self.paddle_data["paddleLeftX"] + self.paddle_data["width"]
                and self.pong_data["pos_x"] >= self.paddle_data["paddleLeftX"]
                and self.paddle_data["paddleLeftY"] <= self.pong_data["pos_y"] <= self.paddle_data["paddleLeftY"] + self.paddle_data["height"]
            ):
                self.pong_data["velocity_x"] *= -1
                if self.pong_data["velocity_x"] >= -16 and self.pong_data["velocity_x"] <= 16:
                    self.pong_data["velocity_x"] *= 1.25
                self.pong_data["pos_x"] = self.paddle_data["paddleLeftX"] + self.paddle_data["width"] + 0.1

        if (ball_left < self.paddle_data["paddleRightX"] + self.paddle_data["width"] and 
        ball_right > self.paddle_data["paddleRightX"] and 
        ball_bottom > self.paddle_data["paddleRightY"] and 
        ball_top < self.paddle_data["paddleRightY"] + self.paddle_data["height"]):
            
            if (
                self.pong_data["pos_x"] >= self.paddle_data["paddleRightX"] 
                and self.pong_data["pos_x"] <= self.paddle_data["paddleRightX"] + self.paddle_data["width"]
                and self.paddle_data["paddleRightY"] <= self.pong_data["pos_y"] <= self.paddle_data["paddleRightY"] + self.paddle_data["height"]
            ):
                self.pong_data["velocity_x"] *= -1
                if self.pong_data["velocity_x"] >= -16 and self.pong_data["velocity_x"] <= 16:
                    self.pong_data["velocity_x"] *= 1.25
                self.pong_data["pos_x"] = self.paddle_data["paddleRightX"] - self.paddle_data["width"] - 0.1

            if self.paddle_data["paddleLeftY"] < 0:
                self.paddle_data["paddleLeftY"] = 0
            if self.paddle_data["paddleLeftY"] + self.paddle_data["height"] > self.paddle_data["height_canvas"]:
                self.paddle_data["paddleLeftY"] = self.paddle_data["height_canvas"] - self.paddle_data["height"]
            
            if self.paddle_data["paddleRightY"] < 0:
                self.paddle_data["paddleRightY"] = 0
            if self.paddle_data["paddleRightY"] + self.paddle_data["height"] > self.paddle_data["height_canvas"]:
                self.paddle_data["paddleRightY"] = self.paddle_data["height_canvas"] - self.paddle_data["height"]
        
    def reset_ball(self, direction=1):
        self.pong_data["pos_x"] = self.paddle_data["width_canvas"] / 2
        self.pong_data["pos_y"] = self.paddle_data["height_canvas"] / 2
        self.pong_data["velocity_x"] = 6 * direction
        self.pong_data["velocity_y"] = random.choice([-8, 8])

class gameConsumer(AsyncWebsocketConsumer):

    game_states = {}
    paddle_data = {}
    current_key_states_P1 = {}
    current_key_states_P2 = {}
    player = {}
    game_locks = {} 

    def __init__(self):  
        self.game_running = False
        self.groups = []

    async def authenticate_user(self, token):
        try:
            payload = jwt.decode(token, os.getenv('JWT_KEY'), algorithms=["HS256"])
            user_id = payload.get('id')
            if user_id:
                user = await self.get_user_from_id(user_id)
                if user:
                    return user
            return None
        except jwt.ExpiredSignatureError:
            print("Token expired")
        except jwt.InvalidTokenError:
            print("Invalid token")
        return None

    @database_sync_to_async
    def get_user_from_id(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
        
    @database_sync_to_async
    def get_game(self, game_id):
        try:
            return Game.objects.get(id=game_id)
        except Exception as e:
            return None
     
    @database_sync_to_async
    def save_game(self, game):
        try:
            game.save()
        except Exception as e:
            print(f"Error saving game: {e}")
            
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.group_name = f"game_{self.game_id}"
        self.token = self.scope['cookies'].get('token')
        self.user = await self.authenticate_user(self.token)
        if self.game_id not in gameConsumer.game_locks:
            gameConsumer.game_locks[self.game_id] = asyncio.Lock()

        async with gameConsumer.game_locks[self.game_id]:
            if self.game_id not in gameConsumer.game_states:
                game = await self.get_game(self.game_id)
                gameConsumer.game_states[self.game_id] = GameState(game)
            self.game_state = gameConsumer.game_states[self.game_id]

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    def get_other_player(self, player_name):
        if player_name == gameConsumer.game_states[self.game_id].player1:
            return gameConsumer.game_states[self.game_id].player2
        elif player_name == gameConsumer.game_states[self.game_id].player2:
            return gameConsumer.game_states[self.game_id].player1
        return None

    async def disconnect(self, close_code):
            if  gameConsumer.game_states[self.game_id].status == "started":
                player_left = self.user.name
                other_player = self.get_other_player(player_left)
                gameConsumer.game_states[self.game_id].status = "aborted"
                gameConsumer.game_states[self.game_id].winner = other_player
                gameConsumer.game_states[self.game_id].loser = player_left
                gameConsumer.game_states[self.game_id].gamerunning = False
            if self.game_id in gameConsumer.paddle_data:
                del gameConsumer.paddle_data[self.game_id]
            if self.game_id in gameConsumer.current_key_states_P1:
                del gameConsumer.current_key_states_P1[self.game_id]
            if self.game_id in gameConsumer.current_key_states_P2:
                del gameConsumer.current_key_states_P2[self.game_id]
            if self.game_id in gameConsumer.player:
                gameConsumer.player[self.game_id] = ""
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data_dict = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if "message" in data_dict:
            self.game_running = True
            game = await self.get_game(self.game_id)
            await self.save_game(game)
            asyncio.create_task(self.run_game_loop(self.game_state, game))
        if "isKeyDown" in data_dict:
            gameConsumer.paddle_data[self.game_id] = {
                "isKeyDown": data_dict["isKeyDown"],
                "player": data_dict["player"]
            }
            self.handle_key_press(gameConsumer.paddle_data[self.game_id])

    async def send_message(self, message):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(self.group_name, message)

    async def game_update(self, event):
        await self.send(text_data=json.dumps(event))
           
    async def run_game_loop(self, game_state, game):
        if gameConsumer.game_states[self.game_id].gamerunning == True:
            return
        gameConsumer.game_states[self.game_id].gamerunning = True
        last_time_updated = time.time()
        accumulated_time = 0
        try:
            while True:
                await asyncio.sleep(1 /60)
                if self.game_id in gameConsumer.current_key_states_P1:
                    self.process_key_states_P1(gameConsumer.current_key_states_P1[self.game_id], game_state)
                if self.game_id in gameConsumer.current_key_states_P2:
                    self.process_key_states_P2(gameConsumer.current_key_states_P2[self.game_id], game_state)
                if game.IA == True:
                    self.IA_in_game(game_state)
                game_state.update()
                current_time = time.time()
                time_diff = current_time - last_time_updated
                accumulated_time += time_diff
                last_time_updated = current_time
                if accumulated_time >= 1:
                    accumulated_time = 0
                    if game_state.timer["seconds"] > 0:
                        game_state.timer["seconds"] -= 1
                    elif game_state.timer["minutes"] > 0:
                        game_state.timer["minutes"] -= 1
                        game_state.timer["seconds"] = 59
                if game_state.is_game_over(game) or game_state.status == "aborted":
                    gameConsumer.game_states[self.game_id].gamerunning = False
                    await self.send_message({
                        "type": "game_update",
                        "score_P1": game_state.score["score_P1"],
                        "score_P2": game_state.score["score_P2"],
                        "winner": game_state.winner,
                        "loser": game_state.loser,
                        "seconds": game_state.timer["seconds"],
                        "minutes": game_state.timer["minutes"],
                        "elo_Player1" : game_state.eloPlayer1,
                        "elo_Player2" : game_state.eloPlayer2,
                        "isInTournament" : game_state.isInTournament,
                        "tournamentCode" : game_state.code,
                        "status" : game_state.status,
                    })
                    break
                await self.send_message({
                    "type": "game_update",
                    "new_pos_x": game_state.pong_data["pos_x"],
                    "new_pos_y": game_state.pong_data["pos_y"],
                    "ball_width": game_state.pong_data["width"],
                    "score_P1": game_state.score["score_P1"],
                    "score_P2": game_state.score["score_P2"],
                    "paddleRightY": game_state.paddle_data["paddleRightY"],
                    "paddleLeftY": game_state.paddle_data["paddleLeftY"],
                    "paddleRightX": game_state.paddle_data["paddleRightX"],
                    "paddleLeftX": game_state.paddle_data["paddleLeftX"],
                    "width": game_state.paddle_data["width"],
                    "height": game_state.paddle_data["height"],
                    "seconds": game_state.timer["seconds"],
                    "minutes": game_state.timer["minutes"],
                    "status" : game_state.status,
                })

        except asyncio.CancelledError:
            print("Game loop was cancelled", flush=True)
    
    def handle_key_press(self, key_states):
        gameConsumer.player[self.game_id] = key_states.get("player", "P1")
        if gameConsumer.player[self.game_id] == "P1" :
            gameConsumer.current_key_states_P1[self.game_id] = key_states.get("isKeyDown")
        elif gameConsumer.player[self.game_id] == "P2" :
            gameConsumer.current_key_states_P2[self.game_id] = key_states.get("isKeyDown")
        if gameConsumer.game_states[self.game_id].player2 == "" :
            gameConsumer.current_key_states_P2[self.game_id] = key_states.get("isKeyDown")
        if self.game_id in gameConsumer.paddle_data:
            del gameConsumer.paddle_data[self.game_id]

    def process_key_states_P1(self, key_states, game_state):
        paddle_speed = 15
        if game_state.player2 != "" and game_state.IA_active == False:
            if key_states.get("ArrowUp", False):
                game_state.paddle_data["paddleLeftY"] = max(
                    0, game_state.paddle_data["paddleLeftY"] - paddle_speed
                )
            if key_states.get("ArrowDown", False):
                game_state.paddle_data["paddleLeftY"] = min(
                    game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                    game_state.paddle_data["paddleLeftY"] + paddle_speed,
                )
        if game_state.player2 == "" and game_state.IA_active == False:
            if key_states.get("ArrowUp", False):
                    game_state.paddle_data["paddleRightY"] = max(
                        0, game_state.paddle_data["paddleRightY"] - paddle_speed
            )
            if key_states.get("ArrowDown", False):
                game_state.paddle_data["paddleRightY"] = min(
                    game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                    game_state.paddle_data["paddleRightY"] + paddle_speed,
            )
        if game_state.player2 == "" and game_state.IA_active == True:
            if key_states.get("ArrowUp", False):
                game_state.paddle_data["paddleLeftY"] = max(
                    0, game_state.paddle_data["paddleLeftY"] - paddle_speed
                )
            if key_states.get("ArrowDown", False):
                game_state.paddle_data["paddleLeftY"] = min(
                    game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                    game_state.paddle_data["paddleLeftY"] + paddle_speed,
                )

    def process_key_states_P2(self, key_states, game_state):
        paddle_speed = 15
        if game_state.player2 != "" and game_state.IA_active == False:
            if key_states.get("ArrowUp", False):
                game_state.paddle_data["paddleRightY"] = max(
                    0, game_state.paddle_data["paddleRightY"] - paddle_speed
                )
            if key_states.get("ArrowDown", False):
                game_state.paddle_data["paddleRightY"] = min(
                    game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                    game_state.paddle_data["paddleRightY"] + paddle_speed,
                )
        if game_state.player2 == "" and game_state.IA_active == False:
            if key_states.get("w", False):
                game_state.paddle_data["paddleLeftY"] = max(
                0, game_state.paddle_data["paddleLeftY"] - paddle_speed
            )
            if key_states.get("s", False):
                game_state.paddle_data["paddleLeftY"] = min(
                game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                game_state.paddle_data["paddleLeftY"] + paddle_speed,
            )

    def IA_in_game(self, game_state):
        paddle_speed = 15
        current_time = time.time()
        time_diff = current_time - game_state.IA_last_timer
        game_state.IA_timer += time_diff
        game_state.IA_last_timer = current_time
        if game_state.IA_timer >= 1:
            time_to_hit = (game_state.paddle_data["paddleRightX"] - game_state.pong_data["pos_x"]) / game_state.pong_data["velocity_x"]
            game_state.IA_pos_y = game_state.pong_data["pos_y"] + game_state.pong_data["velocity_y"] * time_to_hit
            game_state.IA_timer = 0
        if game_state.IA_pos_y < (game_state.paddle_data["paddleRightY"] + game_state.paddle_data["height"] / 2) - 10:
            game_state.IA_up = True
            game_state.IA_down = False
        elif game_state.IA_pos_y  > (game_state.paddle_data["paddleRightY"] + game_state.paddle_data["height"] / 2 ) + 10:
            game_state.IA_up = False
            game_state.IA_down = True
        else :
            game_state.IA_up = False
            game_state.IA_down = False
        if game_state.IA_up == True:
            game_state.paddle_data["paddleRightY"] = max(
                0, game_state.paddle_data["paddleRightY"] - paddle_speed
            )
        if game_state.IA_down == True:
            game_state.paddle_data["paddleRightY"] = min(
                game_state.paddle_data["height_canvas"] - game_state.paddle_data["height"],
                game_state.paddle_data["paddleRightY"] + paddle_speed,
            )