import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Icon,
  useToast,
  Spinner,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';
import { FiPrinter, FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import axios from 'axios';

interface Scanner {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  connection: string;
  os: string;
  available: boolean;
  capabilities?: {
    resolution?: number[];
    color_modes?: string[];
    has_feeder?: boolean;
  };
}

interface ScannerSelectorProps {
  onScannerSelect: (scanner: Scanner) => void;
  selectedScanner: Scanner | null;
}

const ScannerSelector: React.FC<ScannerSelectorProps> = ({
  onScannerSelect,
  selectedScanner,
}) => {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const toast = useToast();

  const fetchScanners = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/scanner/devices', {
        params: { force_refresh: forceRefresh },
      });

      if (response.data.success) {
        setScanners(response.data.scanners);
        
        if (response.data.scanners.length === 0) {
          toast({
            title: 'Aucun scanner détecté',
            description: 'Vérifiez que votre scanner est allumé et connecté.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else {
          toast({
            title: `${response.data.count} scanner(s) détecté(s)`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de détection',
        description: error.response?.data?.error || 'Impossible de détecter les scanners',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const testScanner = async (scannerId: string) => {
    setTesting(scannerId);
    try {
      const response = await axios.post(`/api/scanner/devices/${scannerId}/test`);

      if (response.data.success) {
        toast({
          title: response.data.available ? 'Scanner disponible' : 'Scanner indisponible',
          status: response.data.available ? 'success' : 'warning',
          duration: 3000,
          isClosable: true,
        });

        // Rafraîchir la liste
        await fetchScanners();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de test',
        description: error.response?.data?.error || 'Impossible de tester le scanner',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setTesting(null);
    }
  };

  useEffect(() => {
    fetchScanners();
  }, []);

  const getConnectionBadgeColor = (connection: string) => {
    switch (connection.toLowerCase()) {
      case 'usb':
        return 'blue';
      case 'network':
        return 'green';
      case 'wifi':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wia':
        return 'cyan';
      case 'sane':
        return 'orange';
      case 'twain':
        return 'pink';
      default:
        return 'gray';
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Sélection du scanner</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          onClick={() => fetchScanners(true)}
          isLoading={loading}
          size="sm"
          colorScheme="blue"
        >
          Actualiser
        </Button>
      </HStack>

      {loading && scanners.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Spinner size="xl" color="blue.500" mb={4} />
          <Text color="gray.600">Détection des scanners en cours...</Text>
        </Box>
      ) : scanners.length === 0 ? (
        <Card>
          <CardBody>
            <VStack spacing={4} py={8}>
              <Icon as={FiPrinter} boxSize={12} color="gray.400" />
              <Text color="gray.600" textAlign="center">
                Aucun scanner détecté
              </Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Assurez-vous que votre scanner est allumé et connecté
              </Text>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={() => fetchScanners(true)}
                colorScheme="blue"
                variant="outline"
              >
                Réessayer
              </Button>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {scanners.map((scanner) => (
            <Card
              key={scanner.id}
              cursor="pointer"
              onClick={() => scanner.available && onScannerSelect(scanner)}
              borderWidth={2}
              borderColor={
                selectedScanner?.id === scanner.id
                  ? 'blue.500'
                  : scanner.available
                  ? 'gray.200'
                  : 'red.200'
              }
              bg={selectedScanner?.id === scanner.id ? 'blue.50' : 'white'}
              _hover={{
                borderColor: scanner.available ? 'blue.300' : 'red.300',
                shadow: 'md',
              }}
              opacity={scanner.available ? 1 : 0.7}
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Icon
                      as={FiPrinter}
                      boxSize={6}
                      color={scanner.available ? 'blue.500' : 'gray.400'}
                    />
                    <Icon
                      as={scanner.available ? FiCheckCircle : FiXCircle}
                      color={scanner.available ? 'green.500' : 'red.500'}
                    />
                  </HStack>

                  <Box>
                    <Tooltip label={scanner.name}>
                      <Heading size="sm" noOfLines={1}>
                        {scanner.name}
                      </Heading>
                    </Tooltip>
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      {scanner.manufacturer}
                    </Text>
                  </Box>

                  <HStack spacing={2} flexWrap="wrap">
                    <Badge colorScheme={getTypeBadgeColor(scanner.type)} fontSize="xs">
                      {scanner.type.toUpperCase()}
                    </Badge>
                    <Badge
                      colorScheme={getConnectionBadgeColor(scanner.connection)}
                      fontSize="xs"
                    >
                      {scanner.connection.toUpperCase()}
                    </Badge>
                    <Badge colorScheme="gray" fontSize="xs">
                      {scanner.os}
                    </Badge>
                  </HStack>

                  {scanner.capabilities && (
                    <VStack align="stretch" spacing={1} fontSize="xs" color="gray.600">
                      {scanner.capabilities.resolution && (
                        <Text>
                          Max: {Math.max(...scanner.capabilities.resolution)} DPI
                        </Text>
                      )}
                      {scanner.capabilities.has_feeder && (
                        <Text color="green.600">✓ Chargeur automatique</Text>
                      )}
                    </VStack>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      testScanner(scanner.id);
                    }}
                    isLoading={testing === scanner.id}
                    isDisabled={!scanner.available}
                  >
                    Tester
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default ScannerSelector;
