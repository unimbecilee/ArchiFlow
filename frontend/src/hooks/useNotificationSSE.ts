/**
 * Hook pour les notifications en temps réel via Server-Sent Events (SSE)
 */
import { useEffect, useRef, useState } from 'react';
import config from '../config';

interface NotificationData {
  type: string;
  unread_count?: number;
  recent_notifications?: any[];
  message?: string;
}

interface UseNotificationSSEOptions {
  onUpdate?: (data: NotificationData) => void;
  onError?: (error: string) => void;
}

export const useNotificationSSE = (options: UseNotificationSSEOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Token non trouvé - SSE non démarré');
      return;
    }

    // Créer la connexion SSE avec le token dans l'URL (EventSource ne supporte pas les headers personnalisés)
    const url = `${config.API_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url, {
      withCredentials: true
    });

    eventSourceRef.current = eventSource;

    // Événement de connexion
    eventSource.onopen = () => {
      console.log('✅ SSE connecté');
      setIsConnected(true);
    };

    // Événement de message
    eventSource.onmessage = (event) => {
      try {
        const data: NotificationData = JSON.parse(event.data);
        console.log('📨 SSE message reçu:', data);

        if (data.type === 'update' && data.unread_count !== undefined) {
          setUnreadCount(data.unread_count);
          options.onUpdate?.(data);
        } else if (data.type === 'connected') {
          console.log('✅ SSE:', data.message);
        } else if (data.type === 'error') {
          console.error('❌ SSE erreur:', data.message);
          options.onError?.(data.message || 'Erreur SSE');
        }
      } catch (error) {
        console.error('❌ Erreur parsing SSE:', error);
      }
    };

    // Événement d'erreur
    eventSource.onerror = (error) => {
      console.error('❌ SSE erreur de connexion:', error);
      setIsConnected(false);
      options.onError?.('Erreur de connexion SSE');
    };

    // Nettoyage
    return () => {
      console.log('🔌 Fermeture SSE');
      eventSource.close();
    };
  }, [options.onUpdate, options.onError]);

  return {
    isConnected,
    unreadCount
  };
};
