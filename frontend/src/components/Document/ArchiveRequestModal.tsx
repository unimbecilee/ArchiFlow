import React, { useState, useEffect, ElementType } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Textarea,
  Text,
  Alert,
  AlertIcon,
  Box,
  useToast,
  Icon
} from '@chakra-ui/react';
import { FiArchive, FiClock } from 'react-icons/fi';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { checkAuthToken } from '../../utils/errorHandling';
import config from '../../config';

interface ArchiveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
  onArchiveRequested?: () => void;
}

/**
 * Composant modal pour demander l'archivage d'un document
 */
const ArchiveRequestModal: React.FC<ArchiveRequestModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onArchiveRequested
}) => {
  const { executeOperation } = useAsyncOperation();
  const toast = useToast();

  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Démarre le workflow de validation pour l'archivage du document
   */
  const handleRequestArchive = async () => {
    setIsLoading(true);

    await executeOperation(
      async () => {
        const token = checkAuthToken();
        
        // Utiliser le nouveau système de validation automatique
        const response = await fetch(`${config.API_URL}/api/validation-workflow/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            document_id: documentId,
            commentaire: comment.trim() || "Demande d'archivage"
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erreur lors de la demande d\'archivage');
        }

        const result = await response.json();
        console.log('🔍 Workflow de validation démarré:', result);

        toast({
          title: 'Succès',
          description: 'Demande d\'archivage soumise avec succès. Le workflow de validation a été démarré.',
          status: 'success',
          duration: 5000,
          isClosable: true
        });

        handleClose();
        onArchiveRequested?.();
      },
      {
        loadingMessage: "Soumission de la demande d'archivage...",
        errorMessage: "Impossible de soumettre la demande d'archivage"
      }
    );

    setIsLoading(false);
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent bg="#232946" color="white">
        <ModalHeader>
          <HStack>
            <Icon as={FiArchive as ElementType} color="#3a8bfd" />
            <Text>Demander l'archivage du document</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Document concerné */}
            <Box>
              <Text fontSize="sm" color="gray.400" mb={2}>Document concerné</Text>
              <Box bg="#20243a" p={3} borderRadius="md" border="1px solid #3a8bfd">
                <Text fontWeight="semibold">{documentTitle}</Text>
              </Box>
            </Box>

            {/* Commentaire */}
            <FormControl>
              <FormLabel>Motif de la demande d'archivage (optionnel)</FormLabel>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Précisez pourquoi ce document doit être archivé..."
                bg="#20243a"
                resize="vertical"
                rows={4}
              />
            </FormControl>

            {/* Informations sur le processus */}
            <Alert status="info" variant="left-accent">
              <AlertIcon />
              <Box>
                <Text fontWeight="semibold">Processus d'archivage</Text>
                <Text fontSize="sm">
                  Cette demande sera soumise à validation par votre chef de service, 
                  puis par l'administrateur. Une fois approuvée, le document sera archivé.
                </Text>
              </Box>
            </Alert>

            {/* Boutons d'action */}
            <HStack justifyContent="flex-end" pt={4}>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                colorScheme="blue"
                leftIcon={<Icon as={FiClock as ElementType} />}
                onClick={handleRequestArchive}
                isLoading={isLoading}
              >
                Soumettre la demande
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ArchiveRequestModal;


