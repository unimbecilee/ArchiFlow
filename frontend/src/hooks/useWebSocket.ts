/**
 * Hook personnalisé pour gérer les connexions WebSocket
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import config from '../config';

interface WebSocketOptions {
  onNotification?: (data: any) => void;
  onDocumentEvent?: (data: any) => void;
  onBroadcast?: (data: any) => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token non trouvé');
      return;
    }

    // Créer la connexion WebSocket
    const socket = io(config.API_URL, {
      query: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Événements de connexion
    socket.on('connect', () => {
      console.log('✅ WebSocket connecté');
      setIsConnected(true);
      setError(null);
      
      // S'authentifier
      socket.emit('authenticate');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket déconnecté');
      setIsConnected(false);
    });

    socket.on('error', (err: any) => {
      console.error('❌ Erreur WebSocket:', err);
      setError(err.message || 'Erreur WebSocket');
    });

    socket.on('authenticated', (data: any) => {
      console.log('✅ Authentifié WebSocket:', data);
    });

    // Événements personnalisés
    socket.on('notification', (data: any) => {
      console.log('🔔 Notification reçue:', data);
      options.onNotification?.(data);
    });

    socket.on('document_event', (data: any) => {
      console.log('📄 Événement document:', data);
      options.onDocumentEvent?.(data);
    });

    socket.on('broadcast', (data: any) => {
      console.log('📢 Broadcast reçu:', data);
      options.onBroadcast?.(data);
    });

    // Nettoyage
    return () => {
      socket.disconnect();
    };
  }, [options.onNotification, options.onDocumentEvent, options.onBroadcast]);

  const joinDocument = useCallback((documentId: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_document', { document_id: documentId });
    }
  }, [isConnected]);

  const leaveDocument = useCallback((documentId: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_document', { document_id: documentId });
    }
  }, [isConnected]);

  return {
    isConnected,
    error,
    joinDocument,
    leaveDocument
  };
};
