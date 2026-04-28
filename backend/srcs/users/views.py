from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.decorators import api_view, action
from .serializer import UserSerializer
from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from .models import User, ValidToken, ConfirmationCode
from users.decorator import jwt_auth_required
from django.core.mail import send_mail
from django.conf import settings
from django.utils.timezone import now
import random
import jwt
import os
import re


class LoginView():
    @api_view(['POST'])
    def loginUser(request):
        name = request.data['name']
        password = request.data['password']

        if not name or not password:
            return Response({'error': 'Username or password incorrect!'}, status=status.HTTP_404_NOT_FOUND)

        user = User.objects.filter(name=name).first()

        if user is None:
            return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)
        
        if not user.check_password(password):
            return Response({'error': 'Password incorrect!'}, status=status.HTTP_404_NOT_FOUND)
            
        if ValidToken.objects.filter(user=user).exists():
            return Response({'error': 'User already connected!'}, status=status.HTTP_409_CONFLICT)
            
        if user.enable_verified is True:
            send_confirmation_email(user)
            return Response(
                {'message': 'Verification required. Check your email for the confirmation code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.status = 'online'
        user.save()
        
        profile_image_url = user.profile_image.url if user.profile_image else None
        
        payload = { 
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'status': user.status,
            'profile_image_url': profile_image_url,
            'is_stud': user.is_stud,
            'enable_verified': user.enable_verified,
        }

        token = jwt.encode(payload, os.getenv('JWT_KEY'), 'HS256')
        if ValidToken.objects.filter(user=user).exists():
            return Response({'error': 'User already connected!'}, status=status.HTTP_409_CONFLICT)
        ValidToken.objects.create(user=user, token=token)

        reponse = Response()

        reponse.set_cookie(key='token', value=token, max_age=int(os.getenv('TOKEN_TIME')), httponly=True, secure=True, samesite='None')
        reponse.data = {
            'message': 'Logged in successfully!'
        }
        return reponse

class UserView():
    @api_view(['GET', 'PATCH'])
    def userDetails(request, pk):
        if not request.user.is_authenticated:
            try:
                user = User.objects.get(pk=pk)
            except:
                return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)

            if request.method == 'GET':
                serializer = UserSerializer(user)
                user_data = serializer.data
                if user_data == request.user:
                    filtered_user = {key: value for key, value in user_data.items() if key not in ['password']}
                else:
                    filtered_user = {key: value for key, value in user_data.items() if key not in ['password']}
                return Response(filtered_user)
            
            elif request.method == 'PATCH':
                serializer = UserSerializer(user, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    profile_image_url = user.profile_image.url if user.profile_image else None
                    payload = {
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'status': user.status,
                        'profile_image_url': profile_image_url,
                        'is_stud': user.is_stud,
                        'enable_verified': user.enable_verified,
                    }
                    reponse = Response()
                    new_token = jwt.encode(payload, os.getenv('JWT_KEY'), 'HS256')
                                        
                    ValidToken.objects.filter(user_id=user.id).delete()
                    ValidToken.objects.create(user=user, token=new_token)
                    
                    filtered_user = {key: value for key, value in serializer.data.items() if key not in ['password']}
                    reponse.delete_cookie('token')
                    reponse.set_cookie(key='token', value=new_token, max_age=int(os.getenv('TOKEN_TIME')), httponly=True, secure=True, samesite='None')
                    reponse.data = {
                        **filtered_user
                    }
                    
                    return reponse
                return Response("ErrorUploadingProfileImage", status=status.HTTP_400_BAD_REQUEST)

    @api_view(['POST'])
    def createUser(request):

        email_type = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        email = request.data['email']
        if not re.match(email_type, email) :
            return Response({'error': "Invalid email type!"}, status=status.HTTP_406_NOT_ACCEPTABLE)

        username = request.data['name']
        if User.objects.filter(name=username).exists():
            return Response({'error': "Username already taken!"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)   
        serializer.save()

        print("User created:", serializer.data, flush=True)  # Debugging statement

        return Response(serializer.data)

class LogoutView():
    @api_view(['GET'])
    @jwt_auth_required
    def logoutUser(request):
        
        token = request.COOKIES.get('token')
        if not token :
            return Response({'error': 'TokenExpired'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = User.objects.get(name=request.user.name)

        if user is None:
            return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)

        user.status = 'offline'
        user.save()
        
        ValidToken.objects.filter(token=token).delete()
        
        reponse = Response()
        reponse.delete_cookie('token')
        reponse.data = {
            'message': 'success'
        }
        return reponse


def generate_confirmation_code():
	return f"{random.randint(100000, 999999)}"

def send_confirmation_email(user):

    if user is None:
        return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)

    code = generate_confirmation_code()
    ConfirmationCode.objects.update_or_create(user=user, defaults={"code": code})

    subject = "Votre code de confirmation Transcendance!"
    message = f"Votre code de confirmation est : {code}"
    from_email = settings.EMAIL_HOST_USER
    recipient_list = [user.email]
    send_mail(subject, message, from_email, recipient_list)

@api_view(['POST'])
def verify_code(request):
    name = request.data.get('name')
    code = request.data.get('code')

    if not name or not code:
        return Response({'message': 'Username and code are required!'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(name=name)
    except User.DoesNotExist:
        return Response({'message': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)

    confirmation = ConfirmationCode.objects.filter(user=user).first()

    if confirmation and confirmation.code == code:
        user.is_verified = True
        user.status = 'online'
        user.save()
        
        profile_image_url = user.profile_image.url if user.profile_image else None
        
        payload = { 
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'status': user.status,
            'profile_image_url': profile_image_url,
            'is_stud': user.is_stud,
            'enable_verified': user.enable_verified,
        }

        token = jwt.encode(payload, os.getenv('JWT_KEY'), 'HS256')
        if ValidToken.objects.filter(user=user).exists():
            ValidToken.objects.filter(user=user).delete()
        ValidToken.objects.create(user=user, token=token)

        reponse = Response()

        reponse.set_cookie(key='token', value=token, max_age=int(os.getenv('TOKEN_TIME')), httponly=True, secure=True, samesite='None')
        reponse.data = {
            'message': 'Code is valid!'
        }

        return reponse
    else:
        return Response({'message': 'Code is invalid!'}, status=status.HTTP_400_BAD_REQUEST)

def refresh_token(user, old_token):

    if user is None or not old_token:
        return Response({'error': 'User not found or token invalid!'}, status=status.HTTP_404_NOT_FOUND)
    try:
        payload = jwt.decode(old_token, os.getenv('JWT_KEY'), algorithms=['HS256'])
        new_token = jwt.encode(payload, os.getenv('JWT_KEY'), 'HS256')

        ValidToken.objects.filter(user=user).delete()
        ValidToken.objects.create(user=user, token=new_token)

        return new_token
    except jwt.ExpiredSignatureError:
        return None 
    
@api_view(['POST'])
def permission_verif(request, id):
    user = User.objects.filter(id=id).first()
    if not user:
        return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)
    
    user.enable_verified = not user.enable_verified
    user.save()

    result = True if user.enable_verified else False
    if result :
        message = 'EnableTo2FA'
    else :
        message = 'DisableTo2FA'
    return Response({'message': message})

@api_view(['GET'])
@jwt_auth_required
def fetch_user_data(request):
    user = request.user

    profile_image_url = user.profile_image.url if user.profile_image else None
    if user.is_authenticated:
        payload = { 
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'status': user.status,
            'profile_image_url': profile_image_url,
            'is_stud': user.is_stud,
            'enable_verified': user.enable_verified,
        }
        return Response({'payload': payload})
    return Response({'error': 'Not authenticated'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def check_auth(request):
    token = request.COOKIES.get('token')
    if not token:
        return Response({'isAuthenticated': False}, {'error': 'Not connected'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        payload = jwt.decode(token, os.getenv('JWT_KEY'), algorithms=['HS256'])
        user = User.objects.filter(id=payload['id']).first()
        if user:
            return Response({'isAuthenticated': True, 'user': {'id': user.id, 'name': user.name}})
        else:
            return Response({'isAuthenticated': False})
    except jwt.ExpiredSignatureError:
        return Response({'error': 'TokenExpired'}, status=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError:
        return Response({'error': 'TokenExpired'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def help_me(request):
    name = request.data['name']
    password = request.data['password']

    if not name or not password:
        return Response({'error': 'Username or password incorrect!'}, status=status.HTTP_404_NOT_FOUND)

    user = User.objects.filter(name=name).first()

    if user is None:
        return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)
    if not user.check_password(password):
        return Response({'error': 'Password incorrect!'}, status=status.HTTP_404_NOT_FOUND)

    token = ValidToken.objects.filter(user=user).first()
    if token:
        ValidToken.objects.filter(user=user).delete()
        user.status = "offline"
        user.save()
        return Response({'message': 'Token refreshed, you can now log in!'}, status=status.HTTP_200_OK)

    return Response({'error': 'User not found!'}, status=status.HTTP_404_NOT_FOUND)