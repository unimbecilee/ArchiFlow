import React, { useState, useEffect, ElementType } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Textarea,
  FormControl,
  FormLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  InputGroup,
  InputLeftElement,
  Select
} from '@chakra-ui/react';
import {
  FiArchive,
  FiCheck,
  FiX,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiExternalLink,
  FiFileText,
  FiFolder
} from 'react-icons/fi';
import { checkAuthToken } from '../../utils/errorHandling';
import config from '../../config';

interface ArchiveRequest {
  id: number;
  pydio_document_id: string;
  document_name: string;
  workspace: string;
  path: string;
  pydio_user: string;
  user_email: string;
  metadata: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  archiflow_document_id: number | null;
  created_at: string;
  updated_at: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
}

interface Stats {
  by_status: Record<string, number>;
  total: number;
  last_24h: number;
  by_workspace: Record<string, number>;
}

const statusColors: Record<string, string> = {
  pending: 'yellow',
  approved: 'blue',
  rejected: 'red',
  processing: 'purple',
  completed: 'green',
  failed: 'red'
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué'
};

const PydioArchiveManagement: React.FC = () => {
  const [requests, setRequests] = useState<ArchiveRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ArchiveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isRejectOpen, onOpen: onRejectOpen, onClose: onRejectClose } = useDisclosure();
  const toast = useToast();

  const fetchRequests = async () => {
    try {
      const token = checkAuthToken();
      const statusParam = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      
      const response = await fetch(
        `${config.API_URL}/api/api/v1/pydio/archive-requests${statusParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Pydio-Token': 'archiflow_pydio_api_token_2024'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes d\'archivage',
        status: 'error',
        duration: 5000
      });
    }
  };

  const fetchStats = async () => {
    try {
      const token = checkAuthToken();
      
      const response = await fetch(
        `${config.API_URL}/api/api/v1/pydio/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Pydio-Token': 'archiflow_pydio_api_token_2024'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleApprove = async (request: ArchiveRequest) => {
    setProcessing(true);
    try {
      const token = checkAuthToken();
      
      const response = await fetch(
        `${config.API_URL}/api/api/v1/pydio/archive-requests/${request.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Pydio-Token': 'archiflow_pydio_api_token_2024',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        }
      );
      
      if (response.ok) {
        toast({
          title: 'Succès',
          description: `Document "${request.document_name}" archivé avec succès`,
          status: 'success',
          duration: 5000
        });
        loadData();
        onClose();
      } else {
        throw new Error('Erreur lors de l\'approbation');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'approuver la demande',
        status: 'error',
        duration: 5000
      });
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const token = checkAuthToken();
      
      const response = await fetch(
        `${config.API_URL}/api/api/v1/pydio/archive-requests/${selectedRequest.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Pydio-Token': 'archiflow_pydio_api_token_2024',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            status: 'rejected',
            reason: rejectionReason 
          })
        }
      );
      
      if (response.ok) {
        toast({
          title: 'Demande rejetée',
          description: `La demande pour "${selectedRequest.document_name}" a été rejetée`,
          status: 'info',
          duration: 5000
        });
        loadData();
        onRejectClose();
        setRejectionReason('');
      } else {
        throw new Error('Erreur lors du rejet');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter la demande',
        status: 'error',
        duration: 5000
      });
    }
    setProcessing(false);
  };

  const openApproveModal = (request: ArchiveRequest) => {
    setSelectedRequest(request);
    onOpen();
  };

  const openRejectModal = (request: ArchiveRequest) => {
    setSelectedRequest(request);
    onRejectOpen();
  };

  const filteredRequests = requests.filter(req => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        req.document_name.toLowerCase().includes(search) ||
        req.pydio_user.toLowerCase().includes(search) ||
        req.workspace.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Chargement des demandes d'archivage...</Text>
      </Box>
    );
  }

  return (
    <Box p={6} bg="#1a1d2e" minH="100vh" color="white">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiArchive as ElementType} boxSize={8} color="#3a8bfd" />
            <Heading size="lg">Gestion des Archives Pydio</Heading>
          </HStack>
          <Button
            leftIcon={<Icon as={FiRefreshCw as ElementType} />}
            colorScheme="blue"
            variant="outline"
            onClick={loadData}
          >
            Actualiser
          </Button>
        </HStack>

        {/* Stats Cards */}
        {stats && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card bg="#232946">
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400">Total demandes</StatLabel>
                  <StatNumber color="white">{stats.total}</StatNumber>
                  <StatHelpText color="gray.500">
                    {stats.last_24h} dernières 24h
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg="#232946">
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400">En attente</StatLabel>
                  <StatNumber color="yellow.400">
                    {stats.by_status?.pending || 0}
                  </StatNumber>
                  <StatHelpText color="gray.500">À traiter</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg="#232946">
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400">Terminées</StatLabel>
                  <StatNumber color="green.400">
                    {stats.by_status?.completed || 0}
                  </StatNumber>
                  <StatHelpText color="gray.500">Archivées</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg="#232946">
              <CardBody>
                <Stat>
                  <StatLabel color="gray.400">Rejetées</StatLabel>
                  <StatNumber color="red.400">
                    {stats.by_status?.rejected || 0}
                  </StatNumber>
                  <StatHelpText color="gray.500">Non archivées</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <HStack spacing={4}>
          <InputGroup maxW="300px">
            <InputLeftElement>
              <Icon as={FiSearch as ElementType} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="#232946"
              border="none"
            />
          </InputGroup>
          
          <Select
            maxW="200px"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            bg="#232946"
            border="none"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="completed">Terminées</option>
            <option value="rejected">Rejetées</option>
            <option value="processing">En cours</option>
          </Select>
        </HStack>

        {/* Requests Table */}
        <Box bg="#232946" borderRadius="lg" overflow="hidden">
          <Table variant="simple">
            <Thead bg="#1a1d2e">
              <Tr>
                <Th color="gray.400">Document</Th>
                <Th color="gray.400">Workspace</Th>
                <Th color="gray.400">Demandeur</Th>
                <Th color="gray.400">Date</Th>
                <Th color="gray.400">Statut</Th>
                <Th color="gray.400">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRequests.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8}>
                    <VStack>
                      <Icon as={FiArchive as ElementType} boxSize={12} color="gray.500" />
                      <Text color="gray.500">Aucune demande d'archivage</Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                filteredRequests.map((request) => (
                  <Tr key={request.id} _hover={{ bg: '#2d3250' }}>
                    <Td>
                      <HStack>
                        <Icon as={FiFileText as ElementType} color="#3a8bfd" />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{request.document_name}</Text>
                          <Text fontSize="xs" color="gray.500">{request.path}</Text>
                        </VStack>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack>
                        <Icon as={FiFolder as ElementType} color="yellow.400" />
                        <Text>{request.workspace}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text>{request.pydio_user}</Text>
                        <Text fontSize="xs" color="gray.500">{request.user_email}</Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Text fontSize="sm">{formatDate(request.created_at)}</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={statusColors[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </Td>
                    <Td>
                      {request.status === 'pending' && (
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            colorScheme="green"
                            leftIcon={<Icon as={FiCheck as ElementType} />}
                            onClick={() => openApproveModal(request)}
                          >
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            leftIcon={<Icon as={FiX as ElementType} />}
                            onClick={() => openRejectModal(request)}
                          >
                            Rejeter
                          </Button>
                        </HStack>
                      )}
                      {request.status === 'completed' && request.archiflow_document_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Icon as={FiExternalLink as ElementType} />}
                          onClick={() => window.open(`/documents/${request.archiflow_document_id}`, '_blank')}
                        >
                          Voir
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      {/* Approve Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="#232946" color="white">
          <ModalHeader>Confirmer l'archivage</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <VStack align="stretch" spacing={4}>
                <Alert status="info" variant="left-accent">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Document à archiver</Text>
                    <Text>{selectedRequest.document_name}</Text>
                  </Box>
                </Alert>
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Informations</Text>
                  <VStack align="stretch" spacing={1} fontSize="sm">
                    <HStack justify="space-between">
                      <Text color="gray.400">Workspace:</Text>
                      <Text>{selectedRequest.workspace}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.400">Chemin:</Text>
                      <Text>{selectedRequest.path}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.400">Demandeur:</Text>
                      <Text>{selectedRequest.pydio_user}</Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="green"
              onClick={() => selectedRequest && handleApprove(selectedRequest)}
              isLoading={processing}
            >
              Confirmer l'archivage
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectOpen} onClose={onRejectClose}>
        <ModalOverlay />
        <ModalContent bg="#232946" color="white">
          <ModalHeader>Rejeter la demande</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <VStack align="stretch" spacing={4}>
                <Alert status="warning" variant="left-accent">
                  <AlertIcon />
                  <Text>
                    Vous êtes sur le point de rejeter la demande d'archivage pour "{selectedRequest.document_name}"
                  </Text>
                </Alert>
                
                <FormControl>
                  <FormLabel>Motif du rejet (optionnel)</FormLabel>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Expliquez pourquoi cette demande est rejetée..."
                    bg="#1a1d2e"
                    rows={4}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRejectClose}>
              Annuler
            </Button>
            <Button
              colorScheme="red"
              onClick={handleReject}
              isLoading={processing}
            >
              Confirmer le rejet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PydioArchiveManagement;
