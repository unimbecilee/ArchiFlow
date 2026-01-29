import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Box,
  Text,
  Heading,
  Tag,
  TagLabel,
  TagCloseButton,
  FormControl,
  FormLabel,
  Checkbox,
  CheckboxGroup,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner,
  IconButton,
  Tooltip,
  List,
  ListItem,
  Divider,
  useToast,
  Select,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import config from '../config';
import { useUsersForApproval, useOrganizations, useSharingRoles } from '../hooks/useDirectory';
import { useCreateShare, useRevokeShare } from '../hooks/useSharing';

const API_URL = config.API_URL;

// Composant d'icône personnalisé avec emojis
const CustomIcon: React.FC<{ type: string; size?: 'sm' | 'md' | 'lg' }> = ({ type, size = 'sm' }) => {
  let fontSize = '16px';
  if (size === 'md') fontSize = '20px';
  if (size === 'lg') fontSize = '24px';
  
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
    case 'share':
      return <span style={iconStyle}>🔗</span>;
    case 'close':
      return <span style={iconStyle}>✖️</span>;
    default:
      return <span style={iconStyle}>📄</span>;
  }
};

// Types
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  organisation_id?: number;
}

interface Role {
  nom: string;
  description: string;
}

interface Organization {
  id: number;
  nom: string;
  description: string;
}

interface ShareDestination {
  type: 'utilisateur' | 'role' | 'organisation';
  id: string;
  nom: string;
}

interface ShareData {
  destinataires: ShareDestination[];
  permissions: string[];
  date_expiration?: string;
  commentaire: string;
}

interface ExistingShare {
  id: number;
  document_id: number;
  utilisateur_id?: number;
  role_nom?: string;
  organisation_id?: number;
  permissions: string[];
  date_partage: string;
  date_expiration?: string;
  commentaire: string;
  destinataire_nom: string;
  type_destinataire: 'utilisateur' | 'role' | 'organisation';
  createur_nom: string;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
  onShareSuccess?: () => void;
}

const PERMISSIONS_OPTIONS = [
  { key: 'lecture', label: 'Lecture', icon: <CustomIcon type="view" />, description: 'Peut voir le document' },
  { key: 'téléchargement', label: 'Téléchargement', icon: <CustomIcon type="download" />, description: 'Peut télécharger le fichier' },
  { key: 'modification', label: 'Modification', icon: <CustomIcon type="edit" />, description: 'Peut modifier le document' },
  { key: 'commentaire', label: 'Commentaire', icon: <CustomIcon type="comment" />, description: 'Peut laisser des commentaires' },
  { key: 'partage_supplementaire', label: 'Re-partage', icon: <CustomIcon type="share" />, description: 'Peut partager à son tour' }
];

const PERMISSION_PRESETS = [
  { name: 'Lecteur', permissions: ['lecture'], icon: '👁️', description: 'Lecture seule' },
  { name: 'Téléchargeur', permissions: ['lecture', 'téléchargement'], icon: '⬇️', description: 'Lecture + téléchargement' },
  { name: 'Contributeur', permissions: ['lecture', 'téléchargement', 'commentaire'], icon: '💬', description: 'Lecture, téléchargement et commentaires' },
  { name: 'Éditeur', permissions: ['lecture', 'téléchargement', 'modification', 'commentaire'], icon: '✏️', description: 'Toutes les permissions sauf re-partage' },
  { name: 'Administrateur', permissions: ['lecture', 'téléchargement', 'modification', 'commentaire', 'partage_supplementaire'], icon: '👑', description: 'Toutes les permissions' }
];

const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  documentId,
  documentTitle,
  onShareSuccess
}) => {
  const toast = useToast();
  
  // Couleurs cohérentes avec le thème sombre de l'application
  const bgColor = '#141829';           // Arrière-plan principal
  const cardBg = '#1c2338';            // Arrière-plan des cartes
  const borderColor = '#3a445e';       // Bordures
  const textColor = 'white';           // Texte principal
  const mutedColor = 'gray.400';       // Texte secondaire
  const inputBg = '#2a3657';           // Arrière-plan inputs
  
  // États pour les données
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);

  // États pour le formulaire
  const [shareData, setShareData] = useState<ShareData>({
    destinataires: [],
    permissions: ['lecture'],
    commentaire: ''
  });
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  // États UI
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // États pour les filtres
  const [filterType, setFilterType] = useState<string>('tous');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Hooks pour données répertoire et mutations
  const { data: usersData } = useUsersForApproval();
  const { data: orgsData } = useOrganizations();
  const { data: rolesData } = useSharingRoles();
  const createShareMutation = useCreateShare(documentId);
  const revokeShareMutation = useRevokeShare();

  // Charger les données nécessaires
  useEffect(() => {
    if (open) {
      if (usersData) setUsers(usersData);
      if (orgsData) setOrganizations(orgsData);
      if (rolesData) setRoles(rolesData);
      loadExistingShares();
    }
  }, [open, documentId, usersData, orgsData, rolesData]);

  // Suppression du chargement manuel: hydratation via hooks

  const loadExistingShares = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/shares`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingShares(data.partages || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des partages existants:', err);
    }
  };

  const handleDestinationAdd = (destination: ShareDestination) => {
    if (!shareData.destinataires.find(d => d.type === destination.type && d.id === destination.id)) {
      setShareData(prev => ({
        ...prev,
        destinataires: [...prev.destinataires, destination]
      }));
    }
  };

  const handleDestinationRemove = (index: number) => {
    setShareData(prev => ({
      ...prev,
      destinataires: prev.destinataires.filter((_, i) => i !== index)
    }));
  };

  const handlePermissionChange = (permissions: string[]) => {
    setShareData(prev => ({
      ...prev,
      permissions
    }));
  };

  const handleSubmit = async () => {
    if (shareData.destinataires.length === 0) {
      setError('Veuillez sélectionner au moins un destinataire');
      return;
    }

    if (shareData.permissions.length === 0) {
      setError('Veuillez sélectionner au moins une permission');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        destinataires: shareData.destinataires,
        permissions: shareData.permissions as any,
        date_expiration: expirationDate ? expirationDate.toISOString() : undefined,
        commentaire: shareData.commentaire,
      };
      await createShareMutation.mutateAsync(payload as any);
      toast({
        title: 'Succès',
        description: 'Document partagé avec succès !',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setShareData({ destinataires: [], permissions: ['lecture'], commentaire: '' });
      setExpirationDate(null);
      loadExistingShares();
      onShareSuccess?.();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du partage');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    try {
      await revokeShareMutation.mutateAsync(shareId);
      toast({
        title: 'Succès',
        description: 'Partage révoqué avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadExistingShares();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la révocation du partage');
    }
  };

  const getDestinationIcon = (type: string) => {
    return <CustomIcon type={type} size="sm" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" closeOnOverlayClick={true} closeOnEsc={true}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
        <ModalContent maxW="800px" bg={cardBg} borderColor={borderColor} border="1px" position="relative" zIndex={1400}>
          <ModalHeader bg={cardBg} color={textColor} borderBottom="1px" borderBottomColor={borderColor}>
            <HStack spacing={3}>
              <CustomIcon type="share" size="md" />
              <Text>Partager "{documentTitle}"</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color={textColor} _hover={{ bg: "whiteAlpha.200" }} />

          <ModalBody bg={cardBg} color={textColor} maxHeight="70vh" overflowY="auto">
            {loadingData ? (
              <Box display="flex" justifyContent="center" p={6}>
                <Spinner size="lg" />
              </Box>
            ) : (
              <>
                {/* Messages */}
                {error && (
                  <Alert status="error" mb={4} borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert status="success" mb={4} borderRadius="md">
                    <AlertIcon />
                    {success}
                  </Alert>
                )}

                <Tabs index={activeTab} onChange={setActiveTab} colorScheme="blue">
                  <TabList borderColor={borderColor}>
                    <Tab color={mutedColor} _selected={{ color: 'blue.300', borderColor: 'blue.300' }}>Nouveau partage</Tab>
                    <Tab color={mutedColor} _selected={{ color: 'blue.300', borderColor: 'blue.300' }}>Partages existants ({existingShares.length})</Tab>
                  </TabList>

                  <TabPanels>
                    <TabPanel px={0}>
                      <VStack spacing={6} align="stretch">
                        {/* Sélection des destinataires */}
                        <Box>
                          <Heading size="md" mb={4} color={textColor}>Destinataires</Heading>

                          {/* Filtres pour les destinataires */}
                          <Box mb={4} p={4} bg={inputBg} borderRadius="md" border="1px" borderColor={borderColor}>
                            <HStack spacing={4} wrap="wrap">
                              <FormControl maxW="200px">
                                <FormLabel fontSize="sm" color={textColor}>Filtrer par type</FormLabel>
                                <Select
                                  value={filterType}
                                  onChange={(e) => setFilterType(e.target.value)}
                                  size="sm"
                                  bg={cardBg}
                                  color={textColor}
                                  borderColor={borderColor}
                                  _hover={{ borderColor: 'blue.500' }}
                                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                >
                                  <option value="tous" style={{ backgroundColor: cardBg, color: textColor }}>🔍 Tous les types</option>
                                  <option value="utilisateur" style={{ backgroundColor: cardBg, color: textColor }}>👤 Utilisateurs</option>
                                  <option value="role" style={{ backgroundColor: cardBg, color: textColor }}>👥 Rôles</option>
                                  <option value="organisation" style={{ backgroundColor: cardBg, color: textColor }}>🏢 Organisations</option>
                                </Select>
                              </FormControl>
                              
                              <FormControl maxW="300px">
                                <FormLabel fontSize="sm" color={textColor}>Rechercher</FormLabel>
                                <Input
                                  placeholder="Nom, prénom, email..."
                                  value={searchFilter}
                                  onChange={(e) => setSearchFilter(e.target.value)}
                                  size="sm"
                                  bg={cardBg}
                                  color={textColor}
                                  borderColor={borderColor}
                                  _hover={{ borderColor: 'blue.500' }}
                                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                  _placeholder={{ color: mutedColor }}
                                />
                              </FormControl>
                            </HStack>
                          </Box>

                          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} mb={4}>
                            {/* Utilisateurs */}
                            {(filterType === 'tous' || filterType === 'utilisateur') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Utilisateurs</FormLabel>
                                  <Select
                                    placeholder="Sélectionner un utilisateur..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const userId = e.target.value;
                                      const user = users.find(u => u.id.toString() === userId);
                                      if (user) {
                                        handleDestinationAdd({
                                          type: 'utilisateur',
                                          id: user.id.toString(),
                                          nom: `${user.prenom} ${user.nom}`
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {users
                                      .filter(user => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          user.nom.toLowerCase().includes(searchLower) ||
                                          user.prenom.toLowerCase().includes(searchLower) ||
                                          user.email.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(user => (
                                        <option key={user.id} value={user.id.toString()} style={{ backgroundColor: inputBg, color: textColor }}>
                                          👤 {user.prenom} {user.nom} ({user.email})
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}

                            {/* Rôles */}
                            {(filterType === 'tous' || filterType === 'role') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Rôles</FormLabel>
                                  <Select
                                    placeholder="Sélectionner un rôle..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const roleName = e.target.value;
                                      const role = roles.find(r => r.nom === roleName);
                                      if (role) {
                                        handleDestinationAdd({
                                          type: 'role',
                                          id: role.nom,
                                          nom: role.nom
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {roles
                                      .filter(role => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          role.nom.toLowerCase().includes(searchLower) ||
                                          role.description.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(role => (
                                        <option key={role.nom} value={role.nom} style={{ backgroundColor: inputBg, color: textColor }}>
                                          👥 {role.nom} - {role.description}
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}

                            {/* Organisations */}
                            {(filterType === 'tous' || filterType === 'organisation') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Organisations</FormLabel>
                                  <Select
                                    placeholder="Sélectionner une organisation..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const orgId = e.target.value;
                                      const org = organizations.find(o => o.id.toString() === orgId);
                                      if (org) {
                                        handleDestinationAdd({
                                          type: 'organisation',
                                          id: org.id.toString(),
                                          nom: org.nom
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {organizations
                                      .filter(org => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          org.nom.toLowerCase().includes(searchLower) ||
                                          org.description.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(org => (
                                        <option key={org.id} value={org.id.toString()} style={{ backgroundColor: inputBg, color: textColor }}>
                                          🏢 {org.nom} - {org.description}
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}
                          </Grid>

                          {/* Destinataires sélectionnés */}
                          {shareData.destinataires.length > 0 && (
                            <Box p={4} bg={inputBg} borderRadius="md" border="1px" borderColor={borderColor}>
                              <HStack justify="space-between" mb={3}>
                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                  Destinataires sélectionnés ({shareData.destinataires.length})
                                </Text>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => setShareData(prev => ({ ...prev, destinataires: [] }))}
                                >
                                  Tout effacer
                                </Button>
                              </HStack>
                              <HStack wrap="wrap" spacing={2}>
                                {shareData.destinataires.map((dest, index) => (
                                  <Tag
                                    key={`${dest.type}-${dest.id}`}
                                    size="lg"
                                    variant="solid"
                                    colorScheme="blue"
                                    borderRadius="full"
                                    px={3}
                                    py={2}
                                  >
                                    <Box fontSize="18px" mr={2}>{getDestinationIcon(dest.type)}</Box>
                                    <TagLabel fontWeight="medium">{dest.nom}</TagLabel>
                                    <TagCloseButton onClick={() => handleDestinationRemove(index)} />
                                  </Tag>
                                ))}
                              </HStack>
                            </Box>
                          )}
                          {shareData.destinataires.length === 0 && (
                            <Alert status="info" borderRadius="md">
                              <AlertIcon />
                              Sélectionnez au moins un destinataire pour partager ce document
                            </Alert>
                          )}
                        </Box>

                        {/* Permissions */}
                        <Box>
                          <Heading size="md" mb={4} color={textColor}>Permissions</Heading>
                          
                          {/* Raccourcis de permissions */}
                          <Box mb={4} p={4} bg={inputBg} borderRadius="md" border="1px" borderColor={borderColor}>
                            <Text fontSize="sm" color={mutedColor} mb={3}>Raccourcis rapides :</Text>
                            <HStack spacing={2} wrap="wrap">
                              {PERMISSION_PRESETS.map((preset) => (
                                <Tooltip key={preset.name} label={preset.description}>
                                  <Button
                                    size="sm"
                                    variant={JSON.stringify(shareData.permissions.sort()) === JSON.stringify(preset.permissions.sort()) ? 'solid' : 'outline'}
                                    colorScheme="blue"
                                    leftIcon={<span>{preset.icon}</span>}
                                    onClick={() => handlePermissionChange(preset.permissions)}
                                  >
                                    {preset.name}
                                  </Button>
                                </Tooltip>
                              ))}
                            </HStack>
                          </Box>

                          {/* Permissions détaillées */}
                          <CheckboxGroup
                            value={shareData.permissions}
                            onChange={handlePermissionChange}
                            colorScheme="blue"
                          >
                            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={3}>
                              {PERMISSIONS_OPTIONS.map((perm) => (
                                <Tooltip key={perm.key} label={perm.description} placement="top">
                                  <Box
                                    p={3}
                                    bg={shareData.permissions.includes(perm.key) ? 'blue.900' : inputBg}
                                    borderRadius="md"
                                    border="2px"
                                    borderColor={shareData.permissions.includes(perm.key) ? 'blue.500' : borderColor}
                                    cursor="pointer"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: 'blue.400', transform: 'translateY(-2px)' }}
                                  >
                                    <Checkbox value={perm.key} color={textColor} width="100%">
                                      <VStack align="start" spacing={1}>
                                        <HStack spacing={2}>
                                          <Box fontSize="20px">{perm.icon}</Box>
                                          <Text color={textColor} fontWeight="medium">{perm.label}</Text>
                                        </HStack>
                                        <Text fontSize="xs" color={mutedColor}>{perm.description}</Text>
                                      </VStack>
                                    </Checkbox>
                                  </Box>
                                </Tooltip>
                              ))}
                            </Grid>
                          </CheckboxGroup>
                        </Box>

                        {/* Date d'expiration */}
                        <FormControl>
                          <FormLabel color={textColor}>Date d'expiration (optionnelle)</FormLabel>
                          <Input
                            type="datetime-local"
                            bg={inputBg}
                            color={textColor}
                            borderColor={borderColor}
                            _hover={{ borderColor: 'blue.500' }}
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                            value={expirationDate ? format(expirationDate, "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setExpirationDate(new Date(e.target.value));
                              } else {
                                setExpirationDate(null);
                              }
                            }}
                            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          />
                        </FormControl>

                        {/* Commentaire */}
                        <FormControl>
                          <FormLabel color={textColor}>Commentaire (optionnel)</FormLabel>
                          <Textarea
                            bg={inputBg}
                            color={textColor}
                            borderColor={borderColor}
                            _hover={{ borderColor: 'blue.500' }}
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                            _placeholder={{ color: mutedColor }}
                            value={shareData.commentaire}
                            onChange={(e) => setShareData(prev => ({ ...prev, commentaire: e.target.value }))}
                            placeholder="Ajoutez un message pour les destinataires..."
                            rows={3}
                          />
                        </FormControl>
                      </VStack>
                    </TabPanel>

                    <TabPanel px={0}>
                      {/* Partages existants */}
                      {existingShares.length === 0 ? (
                        <Box textAlign="center" py={8}>
                          <Box fontSize="48px" mb={3}>🔒</Box>
                          <Text color={mutedColor} fontSize="lg">
                            Aucun partage existant pour ce document
                          </Text>
                          <Text color={mutedColor} fontSize="sm" mt={2}>
                            Utilisez l'onglet "Nouveau partage" pour commencer
                          </Text>
                        </Box>
                      ) : (
                        <VStack spacing={3} align="stretch">
                          {existingShares.map((share) => (
                            <Box
                              key={share.id}
                              p={4}
                              bg={inputBg}
                              borderRadius="md"
                              border="1px"
                              borderColor={borderColor}
                              _hover={{ borderColor: 'blue.500', transform: 'translateY(-2px)' }}
                              transition="all 0.2s"
                            >
                              <HStack justify="space-between" align="start" w="100%">
                                <HStack align="start" spacing={3} flex={1}>
                                  <Box fontSize="24px" mt={1}>
                                    {getDestinationIcon(share.type_destinataire)}
                                  </Box>
                                  <VStack align="start" spacing={2} flex={1}>
                                    <HStack>
                                      <Text fontWeight="bold" color={textColor} fontSize="md">{share.destinataire_nom}</Text>
                                      <Tag size="sm" colorScheme="blue" variant="subtle">
                                        {share.type_destinataire}
                                      </Tag>
                                    </HStack>
                                    
                                    <HStack wrap="wrap" spacing={1}>
                                      {share.permissions.map((perm) => (
                                        <Tag key={perm} size="sm" colorScheme="green" variant="outline">
                                          {PERMISSIONS_OPTIONS.find(p => p.key === perm)?.icon}
                                          <TagLabel ml={1}>{perm}</TagLabel>
                                        </Tag>
                                      ))}
                                    </HStack>
                                    
                                    <VStack align="start" spacing={1}>
                                      <Text fontSize="xs" color={mutedColor}>
                                        📅 Partagé le {formatDate(share.date_partage)}
                                      </Text>
                                      <Text fontSize="xs" color={mutedColor}>
                                        👤 Par {share.createur_nom}
                                      </Text>
                                      {share.date_expiration && (
                                        <Text fontSize="xs" color="orange.400" fontWeight="medium">
                                          ⏰ Expire le {formatDate(share.date_expiration)}
                                        </Text>
                                      )}
                                    </VStack>
                                    
                                    {share.commentaire && (
                                      <Box
                                        p={2}
                                        bg={cardBg}
                                        borderRadius="md"
                                        borderLeft="3px solid"
                                        borderLeftColor="blue.500"
                                        w="100%"
                                      >
                                        <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                                          💬 "{share.commentaire}"
                                        </Text>
                                      </Box>
                                    )}
                                  </VStack>
                                </HStack>
                                <Tooltip label="Révoquer le partage">
                                  <IconButton
                                    aria-label="Révoquer"
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    icon={<CustomIcon type="delete" />}
                                    onClick={() => handleRevokeShare(share.id)}
                                    _hover={{ bg: 'red.900' }}
                                  />
                                </Tooltip>
                              </HStack>
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </>
            )}
          </ModalBody>

          <ModalFooter bg={cardBg} borderTop="1px" borderTopColor={borderColor}>
            <Button mr={3} onClick={onClose} variant="ghost" color={textColor} _hover={{ bg: "whiteAlpha.200" }}>
              Fermer
            </Button>
            {activeTab === 0 && (
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={loading}
                loadingText="Partage..."
                isDisabled={shareData.destinataires.length === 0}
                leftIcon={<CustomIcon type="share" />}
              >
                Partager
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
  );
};

export default ShareModal; 

