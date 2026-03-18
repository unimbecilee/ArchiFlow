import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  Progress,
  Text,
  Badge,
  Icon,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import { io, Socket } from 'socket.io-client';

interface ScanProgressData {
  status: string;
  progress: number;
  stage?: string;
  current_page?: number;
  total_pages?: number;
}

interface PageProcessedData {
  page_number: number;
  total_pages: number;
  ocr_text?: string;
  has_ocr?: boolean;
}

interface ScanProgressProps {
  taskId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const ScanProgress: React.FC<ScanProgressProps> = ({
  taskId,
  onComplete,
  onError,
  onCancel,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState<ScanProgressData>({
    status: 'Initialisation...',
    progress: 0,
  });
  const [processedPages, setProcessedPages] = useState<PageProcessedData[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    // Connexion WebSocket
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Rejoindre la room de la tâche
      newSocket.emit('join_scan_task', { task_id: taskId });
    });

    newSocket.on('joined_scan_task', (data) => {
      console.log('Joined scan task room:', data.task_id);
    });

    // Écouter les mises à jour de progression
    newSocket.on('scan_progress', (data) => {
      console.log('Scan progress:', data);
      setProgress(data.data);
    });

    // Écouter les pages traitées
    newSocket.on('page_processed', (data) => {
      console.log('Page processed:', data);
      setProcessedPages((prev) => [...prev, data.data]);
    });

    // Écouter la fin du scan
    newSocket.on('scan_completed', (data) => {
      console.log('Scan completed:', data);
      setIsCompleted(true);
      setProgress({
        status: 'Scan terminé',
        progress: 100,
      });
      
      if (onComplete) {
        onComplete(data.data);
      }
    });

    // Écouter les erreurs
    newSocket.on('scan_failed', (data) => {
      console.error('Scan failed:', data);
      setIsFailed(true);
      setErrorMessage(data.error);
      
      if (onError) {
        onError(data.error);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_scan_task', { task_id: taskId });
        newSocket.disconnect();
      }
    };
  }, [taskId]);

  const handleCancel = async () => {
    setCancelling(true);
    
    try {
      const response = await fetch(`/api/scanner/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (onCancel) {
          onCancel();
        }
      }
    } catch (error) {
      console.error('Failed to cancel scan:', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'scan':
        return 'Numérisation';
      case 'processing':
        return 'Traitement';
      case 'ocr':
        return 'Reconnaissance de texte';
      default:
        return 'En cours';
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'scan':
        return 'blue';
      case 'processing':
        return 'purple';
      case 'ocr':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>
        Progression de la numérisation
      </Heading>

      <VStack spacing={4} align="stretch">
        {/* Statut global */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <HStack>
                  <Icon
                    as={
                      isCompleted
                        ? FiCheckCircle
                        : isFailed
                        ? FiXCircle
                        : FiLoader
                    }
                    color={
                      isCompleted
                        ? 'green.500'
                        : isFailed
                        ? 'red.500'
                        : 'blue.500'
                    }
                    boxSize={6}
                    className={!isCompleted && !isFailed ? 'spin' : ''}
                  />
                  <Text fontWeight="bold">{progress.status}</Text>
                </HStack>
                
                {progress.stage && (
                  <Badge colorScheme={getStageColor(progress.stage)}>
                    {getStageLabel(progress.stage)}
                  </Badge>
                )}
              </HStack>

              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.600">
                    Progression
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    {progress.progress}%
                  </Text>
                </HStack>
                <Progress
                  value={progress.progress}
                  colorScheme={isCompleted ? 'green' : isFailed ? 'red' : 'blue'}
                  size="lg"
                  hasStripe
                  isAnimated={!isCompleted && !isFailed}
                />
              </Box>

              {progress.current_page && progress.total_pages && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    Pages traitées
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {progress.current_page} / {progress.total_pages}
                  </Text>
                </HStack>
              )}

              {!isCompleted && !isFailed && (
                <Button
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={cancelling}
                >
                  Annuler
                </Button>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Erreur */}
        {isFailed && errorMessage && (
          <Alert status="error">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Erreur de numérisation</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Succès */}
        {isCompleted && (
          <Alert status="success">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Numérisation terminée</AlertTitle>
              <AlertDescription>
                {processedPages.length} page(s) numérisée(s) avec succès
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Pages traitées */}
        {processedPages.length > 0 && (
          <Card>
            <CardBody>
              <Heading size="sm" mb={3}>
                Pages traitées ({processedPages.length})
              </Heading>
              <List spacing={2}>
                {processedPages.map((page, index) => (
                  <ListItem key={index} fontSize="sm">
                    <HStack>
                      <ListIcon as={FiCheckCircle} color="green.500" />
                      <Text flex={1}>
                        Page {page.page_number} / {page.total_pages}
                      </Text>
                      {page.has_ocr && (
                        <Badge colorScheme="orange" fontSize="xs">
                          OCR
                        </Badge>
                      )}
                    </HStack>
                    {page.ocr_text && (
                      <Text
                        fontSize="xs"
                        color="gray.600"
                        ml={6}
                        mt={1}
                        noOfLines={2}
                      >
                        {page.ocr_text}
                      </Text>
                    )}
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        )}
      </VStack>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spin {
          animation: spin 2s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default ScanProgress;
