import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Button,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Card,
  CardBody,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiArrowLeft, FiArrowRight, FiPlay } from 'react-icons/fi';
import axios from 'axios';

import ScannerSelector from '../components/Scanner/ScannerSelector';
import ScanSettings, { ScanSettingsData } from '../components/Scanner/ScanSettings';
import ScanProgress from '../components/Scanner/ScanProgress';
import ScanPreview from '../components/Scanner/ScanPreview';

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

const steps = [
  { title: 'Scanner', description: 'Sélection du scanner' },
  { title: 'Paramètres', description: 'Configuration' },
  { title: 'Numérisation', description: 'En cours' },
  { title: 'Résultats', description: 'Pages numérisées' },
];

const ScannerPage: React.FC = () => {
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });

  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);
  const [settings, setSettings] = useState<ScanSettingsData>({
    resolution: 300,
    color_mode: 'color',
    format: 'pdf',
    use_feeder: false,
    num_pages: 1,
    auto_border_detection: true,
    auto_deskew: true,
    denoise: true,
    enhance_contrast: true,
    sharpen: false,
    perform_ocr: true,
    ocr_language: 'fra',
    quality: 85,
  });
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const toast = useToast();

  const handleNext = () => {
    if (activeStep === 0 && !selectedScanner) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez sélectionner un scanner',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (activeStep === 1) {
      handleStartScan();
      return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStartScan = async () => {
    if (!selectedScanner) return;

    setIsScanning(true);

    try {
      const response = await axios.post('/api/scanner/scan', {
        scanner_id: selectedScanner.id,
        settings: settings,
      });

      if (response.data.success) {
        setTaskId(response.data.task_id);
        setActiveStep(2);

        toast({
          title: 'Numérisation démarrée',
          description: 'La numérisation est en cours...',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de numérisation',
        description: error.response?.data?.error || 'Impossible de démarrer la numérisation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsScanning(false);
    }
  };

  const handleScanComplete = (result: any) => {
    setIsScanning(false);
    setActiveStep(3);

    toast({
      title: 'Numérisation terminée',
      description: `${result.total_pages} page(s) numérisée(s) avec succès`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleScanError = (error: string) => {
    setIsScanning(false);

    toast({
      title: 'Erreur de numérisation',
      description: error,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleScanCancel = () => {
    setIsScanning(false);
    setActiveStep(1);

    toast({
      title: 'Numérisation annulée',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleNewScan = () => {
    setActiveStep(0);
    setTaskId(null);
    setIsScanning(false);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* En-tête */}
        <Box>
          <Heading size="lg" mb={2}>
            Scanner de documents
          </Heading>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Système de numérisation avancé</AlertTitle>
              <AlertDescription fontSize="sm">
                Numérisation multi-marques avec traitement d'images et OCR automatique
              </AlertDescription>
            </Box>
          </Alert>
        </Box>

        {/* Stepper */}
        <Card>
          <CardBody>
            <Stepper index={activeStep} colorScheme="blue">
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepIndicator>
                    <StepStatus
                      complete={<StepIcon />}
                      incomplete={<StepNumber />}
                      active={<StepNumber />}
                    />
                  </StepIndicator>

                  <Box flexShrink="0">
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </Box>

                  <StepSeparator />
                </Step>
              ))}
            </Stepper>
          </CardBody>
        </Card>

        {/* Contenu des étapes */}
        <Box>
          {activeStep === 0 && (
            <ScannerSelector
              onScannerSelect={setSelectedScanner}
              selectedScanner={selectedScanner}
            />
          )}

          {activeStep === 1 && (
            <ScanSettings
              settings={settings}
              onChange={setSettings}
              hasFeeder={selectedScanner?.capabilities?.has_feeder}
            />
          )}

          {activeStep === 2 && taskId && (
            <ScanProgress
              taskId={taskId}
              onComplete={handleScanComplete}
              onError={handleScanError}
              onCancel={handleScanCancel}
            />
          )}

          {activeStep === 3 && taskId && (
            <ScanPreview taskId={taskId} />
          )}
        </Box>

        {/* Boutons de navigation */}
        <Card>
          <CardBody>
            <HStack justify="space-between">
              <Button
                leftIcon={<FiArrowLeft />}
                onClick={handlePrevious}
                isDisabled={activeStep === 0 || isScanning}
                variant="outline"
              >
                Précédent
              </Button>

              <HStack>
                {activeStep === 3 && (
                  <Button
                    colorScheme="blue"
                    onClick={handleNewScan}
                  >
                    Nouvelle numérisation
                  </Button>
                )}

                {activeStep < 2 && (
                  <Button
                    rightIcon={activeStep === 1 ? <FiPlay /> : <FiArrowRight />}
                    onClick={handleNext}
                    colorScheme="blue"
                    isLoading={isScanning}
                  >
                    {activeStep === 1 ? 'Démarrer la numérisation' : 'Suivant'}
                  </Button>
                )}
              </HStack>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default ScannerPage;
