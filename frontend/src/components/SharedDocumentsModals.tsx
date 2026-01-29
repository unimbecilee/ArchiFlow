import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  VStack
} from '@chakra-ui/react';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: { titre: string; description: string; tags: string };
  setMetadata: (metadata: any) => void;
  onSave: () => void;
  cardBg: string;
  borderColor: string;
  textColor: string;
  inputBg: string;
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  commentText: string;
  setCommentText: (text: string) => void;
  onSave: () => void;
  cardBg: string;
  borderColor: string;
  textColor: string;
  inputBg: string;
  mutedColor: string;
}

interface DeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelRef: React.RefObject<HTMLButtonElement>;
  documentTitle: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
  isOpen,
  onClose,
  metadata,
  setMetadata,
  onSave,
  cardBg,
  borderColor,
  textColor,
  inputBg
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
      <ModalContent bg={cardBg} borderColor={borderColor} border="1px">
        <ModalHeader color={textColor}>Modifier les métadonnées</ModalHeader>
        <ModalCloseButton color={textColor} />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color={textColor}>Titre</FormLabel>
              <Input
                value={metadata.titre}
                onChange={(e) => setMetadata({ ...metadata, titre: e.target.value })}
                bg={inputBg}
                color={textColor}
                borderColor={borderColor}
                _hover={{ borderColor: 'blue.500' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
              />
            </FormControl>
            <FormControl>
              <FormLabel color={textColor}>Description</FormLabel>
              <Textarea
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                bg={inputBg}
                color={textColor}
                borderColor={borderColor}
                _hover={{ borderColor: 'blue.500' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                rows={4}
              />
            </FormControl>
            <FormControl>
              <FormLabel color={textColor}>Tags (séparés par des virgules)</FormLabel>
              <Input
                value={metadata.tags}
                onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
                bg={inputBg}
                color={textColor}
                borderColor={borderColor}
                _hover={{ borderColor: 'blue.500' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
            Annuler
          </Button>
          <Button colorScheme="blue" onClick={onSave}>
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  commentText,
  setCommentText,
  onSave,
  cardBg,
  borderColor,
  textColor,
  inputBg,
  mutedColor
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
      <ModalContent bg={cardBg} borderColor={borderColor} border="1px">
        <ModalHeader color={textColor}>💬 Ajouter un commentaire</ModalHeader>
        <ModalCloseButton color={textColor} />
        <ModalBody>
          <FormControl>
            <FormLabel color={textColor}>Votre commentaire</FormLabel>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Écrivez votre commentaire ici..."
              bg={inputBg}
              color={textColor}
              borderColor={borderColor}
              _hover={{ borderColor: 'blue.500' }}
              _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
              _placeholder={{ color: mutedColor }}
              rows={6}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            onClick={onSave}
            isDisabled={!commentText.trim()}
          >
            Publier
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const DeleteAlert: React.FC<DeleteAlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cancelRef,
  documentTitle,
  cardBg,
  borderColor,
  textColor
}) => {
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay bg="blackAlpha.800" backdropFilter="blur(5px)">
        <AlertDialogContent bg={cardBg} borderColor={borderColor} border="1px">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color={textColor}>
            🗑️ Supprimer le document
          </AlertDialogHeader>

          <AlertDialogBody color={textColor}>
            Êtes-vous sûr de vouloir supprimer le document <strong>"{documentTitle}"</strong> ?
            Cette action est irréversible.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} variant="ghost" color={textColor}>
              Annuler
            </Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3}>
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
