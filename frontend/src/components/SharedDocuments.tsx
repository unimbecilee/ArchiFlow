import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  Select,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Tag,
  TagLabel,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  Grid,
  GridItem,
  Flex,
  Spacer,
  Divider,
  useToast,
  Container,
  useDisclosure,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
  FormControl,
  FormLabel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { format, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import DocumentPreview from './DocumentPreview';
import ShareModal from './ShareModal';
import { MetadataModal, CommentModal, DeleteAlert } from './SharedDocumentsModals';
import config from '../config';

// Composant d'icône personnalisé avec emojis
const CustomIcon: React.FC<{ type: string; size?: 'sm' | 'md' | 'lg' }> = ({ type, size = 'sm' }) => {
  let fontSize = '16px';
  if (size === 'md') fontSize = '24px';
  if (size === 'lg') fontSize = '40px';
  
  const iconStyle = {
    fontSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  switch (type) {
    case 'utilisateur':
      return <span style={iconStyle}>👤</span>;
    case 'role':
      return <span style={iconStyle}>👥</span>;
    case 'organisation':
      return <span style={iconStyle}>🏢</span>;
    case 'view':
      return <span style={iconStyle}>👁️</span>;
    case 'download':
      return <span style={iconStyle}>⬇️</span>;
    case 'edit':
      return <span style={iconStyle}>✏️</span>;
    case 'comment':
      return <span style={iconStyle}>💬</span>;
    case 'delete':
      return <span style={iconStyle}>🗑️</span>;
    case 'search':
      return <span style={iconStyle}>🔍</span>;
    case 'schedule':
      return <span style={iconStyle}>📅</span>;
    case 'warning':
      return <span style={iconStyle}>⚠️</span>;
    case 'share':
      return <span style={iconStyle}>📤</span>;
    case 'menu':
      return <span style={iconStyle}>⋮</span>;
    default:
      return <span style={iconStyle}>📄</span>;
  }
};

// Types
interface SharedDocument {
  id: number;
  titre: string;
  description?: string;
  nom_fichier: string;
  taille: number;
  type_mime: string;
  date_creation: string;
  date_modification: string;
  permissions: string[];
  date_partage: string;
  date_expiration?: string;
  commentaire?: string;
  createur_nom: string;
  type_destinataire: 'utilisateur' | 'role' | 'organisation';
  destinataire_nom: string;
  partage_id: number;
}

interface FilterState {
  search: string;
  typePartage: string;
  permissions: string;
  category: string;
}

const SharedDocuments: React.FC = () => {
  const toast = useToast();
  
  // Couleurs adaptées au thème sombre de l'application
  const bgColor = '#141829';           // Arrière-plan principal de l'app
  const cardBg = '#1c2338';            // Arrière-plan des cartes (comme Dashboard)
  const borderColor = '#3a445e';       // Bordures de l'app
  const textColor = 'white';           // Texte principal
  const mutedColor = 'gray.400';       // Texte secondaire
  const inputBg = '#2a3657';           // Arrière-plan inputs (comme Dashboard)
  
  // États
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewDocumentTitle, setPreviewDocumentTitle] = useState<string>('');
  
  // États pour les modals
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();
  const { isOpen: isMetadataOpen, onOpen: onMetadataOpen, onClose: onMetadataClose } = useDisclosure();
  const { isOpen: isCommentOpen, onOpen: onCommentOpen, onClose: onCommentClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  // États pour les actions
  const [selectedDocument, setSelectedDocument] = useState<SharedDocument | null>(null);
  const [commentText, setCommentText] = useState('');
  const [metadata, setMetadata] = useState({ titre: '', description: '', tags: '' });
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Filtres
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    typePartage: '',
    permissions: '',
    category: ''
  });

  // Charger les documents partagés
  useEffect(() => {
    loadSharedDocuments();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    applyFilters();
  }, [documents, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSharedDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/shared-documents');
      console.log('Données reçues:', response.data);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des documents partagés');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Filtre de recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.titre.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.nom_fichier.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par type de partage
    if (filters.typePartage) {
      filtered = filtered.filter(doc => doc.type_destinataire === filters.typePartage);
    }

    // Filtre par permissions
    if (filters.permissions) {
      filtered = filtered.filter(doc => doc.permissions.includes(filters.permissions));
    }

    setFilteredDocuments(filtered);
  };

  const handleDownload = async (document: SharedDocument) => {
    if (!document.permissions.includes('téléchargement')) {
      toast({
        title: 'Permission refusée',
        description: 'Vous n\'avez pas la permission de télécharger ce document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${config.API_URL}/api/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Accès non autorisé à ce document');
        } else if (response.status === 404) {
          throw new Error('Document non trouvé');
        } else {
          throw new Error('Erreur lors du téléchargement');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.nom_fichier || document.titre;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      toast({
        title: 'Téléchargement réussi',
        description: `Le document "${document.titre}" a été téléchargé`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Erreur de téléchargement:', err);
      toast({
        title: 'Erreur de téléchargement',
        description: err instanceof Error ? err.message : 'Impossible de télécharger le document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleView = (document: SharedDocument) => {
    if (!document.permissions.includes('lecture')) {
      toast({
        title: 'Permission refusée',
        description: 'Vous n\'avez pas la permission de voir ce document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setPreviewDocumentId(document.id);
    setPreviewDocumentTitle(document.titre);
    onPreviewOpen();
  };

  const handleEdit = (document: SharedDocument) => {
    if (!document.permissions.includes('modification')) {
      toast({
        title: 'Permission refusée',
        description: 'Vous n\'avez pas la permission de modifier ce document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSelectedDocument(document);
    setMetadata({ titre: document.titre, description: document.description || '', tags: '' });
    onMetadataOpen();
  };

  const handleComment = (document: SharedDocument) => {
    if (!document.permissions.includes('commentaire')) {
      toast({
        title: 'Permission refusée',
        description: 'Vous n\'avez pas la permission de commenter ce document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSelectedDocument(document);
    setCommentText('');
    onCommentOpen();
  };

  const handleShare = (document: SharedDocument) => {
    if (!document.permissions.includes('partage_supplementaire')) {
      toast({
        title: 'Permission refusée',
        description: 'Vous n\'avez pas la permission de partager ce document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSelectedDocument(document);
    onShareOpen();
  };

  const handleDeleteConfirm = (document: SharedDocument) => {
    setSelectedDocument(document);
    onDeleteOpen();
  };

  const handleSaveMetadata = async () => {
    if (!selectedDocument) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}/api/documents/${selectedDocument.id}/metadata`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      toast({
        title: 'Succès',
        description: 'Métadonnées mises à jour avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onMetadataClose();
      loadSharedDocuments();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les métadonnées',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSaveComment = async () => {
    if (!selectedDocument || !commentText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}/api/documents/${selectedDocument.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentText })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout du commentaire');

      toast({
        title: 'Succès',
        description: 'Commentaire ajouté avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onCommentClose();
      setCommentText('');
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le commentaire',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_URL}/api/documents/${selectedDocument.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      toast({
        title: 'Succès',
        description: 'Document supprimé avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      loadSharedDocuments();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Date invalide';
    
    try {
      let date: Date;
      
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return 'Date invalide';
      }
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (error) {
      console.warn('Erreur formatage date:', error, 'Value:', dateValue);
      return 'Date invalide';
    }
  };



  const getExpirationStatus = (dateExpiration?: string) => {
    if (!dateExpiration) return null;

    try {
      const expDate = new Date(dateExpiration);
      if (isNaN(expDate.getTime())) return null;
      
      const now = new Date();
      const threeDaysFromNow = addDays(now, 3);

      if (isBefore(expDate, now)) {
        return { type: 'expired', message: 'Expiré' };
      } else if (isBefore(expDate, threeDaysFromNow)) {
        return { type: 'expiring', message: 'Expire bientôt' };
      }
      return null;
    } catch {
      return null;
    }
  };

  const getPermissionTags = (permissions: string[]) => {
    const permissionLabels: Record<string, { label: string; color: string }> = {
      'lecture': { label: 'Lecture', color: 'blue' },
      'téléchargement': { label: 'Téléchargement', color: 'green' },
      'modification': { label: 'Modification', color: 'orange' },
      'commentaire': { label: 'Commentaire', color: 'purple' },
      'partage_supplementaire': { label: 'Re-partage', color: 'pink' }
    };

    return permissions.map(perm => {
      const config = permissionLabels[perm] || { label: perm, color: 'gray' };
      return (
        <Tag
          key={perm}
          size="sm"
          variant="solid"
          colorScheme={config.color}
          mr={1}
          mb={1}
        >
          <TagLabel>{config.label}</TagLabel>
        </Tag>
      );
    });
  };

  const getTypeDestinataireConfig = (type: string) => {
    const configs = {
      'utilisateur': { label: 'Utilisateur', color: 'blue', icon: '👤' },
      'role': { label: 'Rôle', color: 'purple', icon: '👥' },
      'organisation': { label: 'Organisation', color: 'teal', icon: '🏢' }
    };
    return configs[type as keyof typeof configs] || { label: type, color: 'gray', icon: '📄' };
  };

  if (loading) {
    return (
      <Box minHeight="100vh" bg={bgColor} display="flex" justifyContent="center" alignItems="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text fontSize="lg" color={mutedColor}>Chargement des documents partagés...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minHeight="100vh" bg={bgColor} p={8}>
        <Container maxW="container.lg">
          <Alert status="error" borderRadius="lg" p={6}>
            <AlertIcon boxSize="24px" />
            <VStack align="start" spacing={2}>
              <Text fontSize="lg" fontWeight="bold">Erreur de chargement</Text>
              <Text>{error}</Text>
            </VStack>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bg={bgColor}>
      <Container maxW="container.xl" py={8}>
        {/* En-tête amélioré */}
        <VStack spacing={6} mb={8}>
          <HStack spacing={4}>
            <CustomIcon type="share" size="lg" />
            <VStack align="start" spacing={1}>
              <Heading size="xl" color={textColor}>Documents Partagés</Heading>
              <Text color={mutedColor} fontSize="lg">
                Gérez et accédez aux documents partagés avec vous
              </Text>
            </VStack>
          </HStack>
        </VStack>

        {/* Filtres améliorés */}
        <Card mb={8} bg={cardBg} borderColor={borderColor} shadow="lg" position="relative" zIndex={999}>
          <CardHeader>
            <HStack spacing={2}>
              <CustomIcon type="search" size="md" />
              <Heading size="md" color={textColor}>Filtres de recherche</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6} alignItems="end">
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>Rechercher</Text>
                  <Input
                    placeholder="Titre, description, nom du fichier..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    size="lg"
                    bg={inputBg}
                    borderColor={borderColor}
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                  />
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>Type de partage</Text>
                  <Select
                    value={filters.typePartage}
                    onChange={(e) => setFilters({ ...filters, typePartage: e.target.value })}
                    size="lg"
                    bg={inputBg}
                    borderColor={borderColor}
                    color="white"
                    zIndex={1000}
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                  >
                    <option value="" style={{ backgroundColor: '#2a3657', color: 'white' }}>Tous les types</option>
                    <option value="utilisateur" style={{ backgroundColor: '#2a3657', color: 'white' }}>👤 Utilisateur</option>
                    <option value="role" style={{ backgroundColor: '#2a3657', color: 'white' }}>👥 Rôle</option>
                    <option value="organisation" style={{ backgroundColor: '#2a3657', color: 'white' }}>🏢 Organisation</option>
                  </Select>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>Permissions</Text>
                  <Select
                    value={filters.permissions}
                    onChange={(e) => setFilters({ ...filters, permissions: e.target.value })}
                    size="lg"
                    bg={inputBg}
                    borderColor={borderColor}
                    color="white"
                    zIndex={1000}
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                  >
                    <option value="" style={{ backgroundColor: '#2a3657', color: 'white' }}>Toutes les permissions</option>
                    <option value="lecture" style={{ backgroundColor: '#2a3657', color: 'white' }}>👁️ Lecture</option>
                    <option value="téléchargement" style={{ backgroundColor: '#2a3657', color: 'white' }}>⬇️ Téléchargement</option>
                    <option value="modification" style={{ backgroundColor: '#2a3657', color: 'white' }}>✏️ Modification</option>
                    <option value="commentaire" style={{ backgroundColor: '#2a3657', color: 'white' }}>💬 Commentaire</option>
                    <option value="partage_supplementaire" style={{ backgroundColor: '#2a3657', color: 'white' }}>🔗 Re-partage</option>
                  </Select>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" fontWeight="semibold" color="blue.500">Résultats</Text>
                  <HStack>
                    <Badge colorScheme="blue" fontSize="md" px={3} py={1} borderRadius="full">
                      {filteredDocuments.length} document(s)
                    </Badge>
                    {filters.search || filters.typePartage || filters.permissions ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => setFilters({ search: '', typePartage: '', permissions: '', category: '' })}
                      >
                        Réinitialiser
                      </Button>
                    ) : null}
                  </HStack>
                </VStack>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        {/* Liste des documents améliorée */}
        {filteredDocuments.length === 0 ? (
          <Card bg={cardBg} borderColor={borderColor} shadow="lg">
            <CardBody textAlign="center" py={16}>
              <VStack spacing={6}>
                <CustomIcon type="share" size="lg" />
                <VStack spacing={2}>
                  <Heading size="lg" color={mutedColor}>
                    {documents.length === 0 ? 'Aucun document partagé' : 'Aucun résultat trouvé'}
                  </Heading>
                  <Text color={mutedColor} fontSize="lg">
                    {documents.length === 0 
                      ? 'Les documents partagés avec vous apparaîtront ici'
                      : 'Essayez de modifier vos critères de recherche'
                    }
                  </Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(400px, 1fr))" gap={8}>
            {filteredDocuments.map((document) => {
              const expirationStatus = getExpirationStatus(document.date_expiration);
              const typeConfig = getTypeDestinataireConfig(document.type_destinataire);
              
              return (
                <Card 
                  key={document.id} 
                  variant="outline" 
                  bg={cardBg} 
                  borderColor={borderColor}
                  shadow="lg"
                >
                  <CardBody p={6}>
                    {/* Alerte d'expiration améliorée */}
                    {expirationStatus && (
                      <Alert 
                        status={expirationStatus.type === 'expired' ? 'error' : 'warning'}
                        mb={6}
                        borderRadius="lg"
                        variant="left-accent"
                      >
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="bold">
                            {expirationStatus.message}
                          </Text>
                          {document.date_expiration && (
                            <Text fontSize="xs">
                              {formatDate(document.date_expiration)}
                            </Text>
                          )}
                        </VStack>
                      </Alert>
                    )}

                    {/* En-tête du document */}
                    <VStack align="start" spacing={4} mb={6}>
                      <HStack justify="space-between" w="100%">
                        <Heading size="md" color={textColor} noOfLines={2} title={document.titre} flex={1}>
                          {document.titre}
                        </Heading>
                        <Badge 
                          colorScheme={typeConfig.color} 
                          variant="solid" 
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          {typeConfig.icon} {typeConfig.label}
                        </Badge>
                      </HStack>
                      
                      {document.description && (
                        <Text color={mutedColor} fontSize="sm" noOfLines={2}>
                          {document.description}
                        </Text>
                      )}
                    </VStack>

                    {/* Informations du fichier */}
                    <VStack align="start" spacing={3} mb={6}>
                      <HStack>
                        <Text fontSize="sm" color={textColor} fontWeight="medium">
                          📄 {document.nom_fichier}
                        </Text>
                        <Spacer />
                        <Badge variant="outline" colorScheme="gray">
                          {formatFileSize(document.taille)}
                        </Badge>
                      </HStack>

                      <HStack wrap="wrap" spacing={2}>
                        <Text fontSize="sm" color={mutedColor}>Partagé par</Text>
                        <Text fontSize="sm" color={textColor} fontWeight="semibold">
                          {document.createur_nom}
                        </Text>
                        <Text fontSize="sm" color={mutedColor}>avec</Text>
                        <HStack spacing={1}>
                          <Text fontSize="sm">{typeConfig.icon}</Text>
                          <Text fontSize="sm" color={textColor} fontWeight="semibold">
                            {document.destinataire_nom}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>

                    {/* Permissions améliorées */}
                    <VStack align="start" spacing={3} mb={6}>
                      <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                        Permissions accordées :
                      </Text>
                      <Flex wrap="wrap" gap={2}>
                        {getPermissionTags(document.permissions)}
                      </Flex>
                    </VStack>

                    {/* Date avec icône */}
                    <HStack spacing={2} mb={6}>
                      <CustomIcon type="schedule" />
                      <Text fontSize="sm" color={mutedColor}>
                        Partagé le {formatDate(document.date_partage)}
                      </Text>
                    </HStack>
                  </CardBody>

                  <Divider borderColor={borderColor} />

                  {/* Actions améliorées avec menu */}
                  <CardBody pt={4} pb={6}>
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3}>
                        {document.permissions.includes('lecture') && (
                          <Tooltip label="Voir le document" hasArrow>
                            <Button
                              size="sm"
                              variant="solid"
                              colorScheme="blue"
                              leftIcon={<CustomIcon type="view" />}
                              onClick={() => handleView(document)}
                            >
                              Voir
                            </Button>
                          </Tooltip>
                        )}
                        
                        {document.permissions.includes('téléchargement') && (
                          <Tooltip label="Télécharger" hasArrow>
                            <IconButton
                              aria-label="Télécharger"
                              size="sm"
                              variant="ghost"
                              colorScheme="green"
                              icon={<CustomIcon type="download" />}
                              onClick={() => handleDownload(document)}
                            />
                          </Tooltip>
                        )}
                      </HStack>

                      {/* Menu d'actions */}
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="Actions"
                          icon={<CustomIcon type="menu" />}
                          variant="ghost"
                          size="sm"
                          colorScheme="gray"
                        />
                        <MenuList bg={cardBg} borderColor={borderColor}>
                          {document.permissions.includes('modification') && (
                            <MenuItem
                              icon={<CustomIcon type="edit" />}
                              onClick={() => handleEdit(document)}
                              bg={cardBg}
                              color={textColor}
                              _hover={{ bg: inputBg }}
                            >
                              Modifier les métadonnées
                            </MenuItem>
                          )}
                          
                          {document.permissions.includes('commentaire') && (
                            <MenuItem
                              icon={<CustomIcon type="comment" />}
                              onClick={() => handleComment(document)}
                              bg={cardBg}
                              color={textColor}
                              _hover={{ bg: inputBg }}
                            >
                              Ajouter un commentaire
                            </MenuItem>
                          )}
                          
                          {document.permissions.includes('partage_supplementaire') && (
                            <>
                              <MenuDivider />
                              <MenuItem
                                icon={<span style={{ fontSize: '16px' }}>🔗</span>}
                                onClick={() => handleShare(document)}
                                bg={cardBg}
                                color={textColor}
                                _hover={{ bg: inputBg }}
                              >
                                Re-partager
                              </MenuItem>
                            </>
                          )}
                          
                          <MenuDivider />
                          <MenuItem
                            icon={<CustomIcon type="delete" />}
                            onClick={() => handleDeleteConfirm(document)}
                            bg={cardBg}
                            color="red.400"
                            _hover={{ bg: 'red.900' }}
                          >
                            Supprimer
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Flex>
                  </CardBody>
                </Card>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Modal d'aperçu de document */}
      <DocumentPreview
        isOpen={isPreviewOpen}
        onClose={onPreviewClose}
        documentId={previewDocumentId}
        documentTitle={previewDocumentTitle}
      />

      {/* Modal de partage */}
      {selectedDocument && (
        <ShareModal
          open={isShareOpen}
          onClose={onShareClose}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.titre}
          onShareSuccess={() => {
            loadSharedDocuments();
            toast({
              title: 'Succès',
              description: 'Document partagé avec succès',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          }}
        />
      )}

      {/* Modal de modification des métadonnées */}
      <MetadataModal
        isOpen={isMetadataOpen}
        onClose={onMetadataClose}
        metadata={metadata}
        setMetadata={setMetadata}
        onSave={handleSaveMetadata}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        inputBg={inputBg}
      />

      {/* Modal de commentaire */}
      <CommentModal
        isOpen={isCommentOpen}
        onClose={onCommentClose}
        commentText={commentText}
        setCommentText={setCommentText}
        onSave={handleSaveComment}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        inputBg={inputBg}
        mutedColor={mutedColor}
      />

      {/* Dialog de confirmation de suppression */}
      <DeleteAlert
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        cancelRef={cancelRef}
        documentTitle={selectedDocument?.titre || ''}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
      />
    </Box>
  );
};

export default SharedDocuments; 


