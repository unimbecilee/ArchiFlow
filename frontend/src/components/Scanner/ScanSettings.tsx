import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
  Divider,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';

export interface ScanSettingsData {
  resolution: number;
  color_mode: 'color' | 'grayscale' | 'bw';
  format: 'pdf' | 'jpg' | 'png';
  use_feeder: boolean;
  num_pages: number;
  auto_border_detection: boolean;
  auto_deskew: boolean;
  denoise: boolean;
  enhance_contrast: boolean;
  sharpen: boolean;
  perform_ocr: boolean;
  ocr_language: string;
  quality: number;
}

interface ScanSettingsProps {
  settings: ScanSettingsData;
  onChange: (settings: ScanSettingsData) => void;
  hasFeeder?: boolean;
}

const ScanSettings: React.FC<ScanSettingsProps> = ({
  settings,
  onChange,
  hasFeeder = false,
}) => {
  const updateSetting = (key: keyof ScanSettingsData, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Box>
      <Heading size="md" mb={4}>
        Paramètres de numérisation
      </Heading>

      <VStack spacing={6} align="stretch">
        {/* Paramètres de base */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>
              Paramètres de base
            </Heading>

            <VStack spacing={4} align="stretch">
              {/* Résolution */}
              <FormControl>
                <HStack justify="space-between" mb={2}>
                  <FormLabel mb={0}>Résolution (DPI)</FormLabel>
                  <Text fontWeight="bold" color="blue.600">
                    {settings.resolution} DPI
                  </Text>
                </HStack>
                <Slider
                  value={settings.resolution}
                  onChange={(val) => updateSetting('resolution', val)}
                  min={75}
                  max={600}
                  step={75}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.600">
                    75 (Rapide)
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    600 (Haute qualité)
                  </Text>
                </HStack>
              </FormControl>

              {/* Mode couleur */}
              <FormControl>
                <FormLabel>Mode couleur</FormLabel>
                <Select
                  value={settings.color_mode}
                  onChange={(e) =>
                    updateSetting('color_mode', e.target.value as any)
                  }
                >
                  <option value="color">Couleur</option>
                  <option value="grayscale">Niveaux de gris</option>
                  <option value="bw">Noir et blanc</option>
                </Select>
              </FormControl>

              {/* Format */}
              <FormControl>
                <FormLabel>Format de sortie</FormLabel>
                <Select
                  value={settings.format}
                  onChange={(e) => updateSetting('format', e.target.value as any)}
                >
                  <option value="pdf">PDF</option>
                  <option value="jpg">JPEG</option>
                  <option value="png">PNG</option>
                </Select>
              </FormControl>

              {/* Qualité */}
              <FormControl>
                <HStack justify="space-between" mb={2}>
                  <FormLabel mb={0}>Qualité de compression</FormLabel>
                  <Text fontWeight="bold" color="blue.600">
                    {settings.quality}%
                  </Text>
                </HStack>
                <Slider
                  value={settings.quality}
                  onChange={(val) => updateSetting('quality', val)}
                  min={50}
                  max={100}
                  step={5}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.600">
                    50 (Petit fichier)
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    100 (Meilleure qualité)
                  </Text>
                </HStack>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Paramètres de numérisation */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>
              Numérisation
            </Heading>

            <VStack spacing={4} align="stretch">
              {/* Chargeur automatique */}
              {hasFeeder && (
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0} flex={1}>
                    Utiliser le chargeur automatique
                  </FormLabel>
                  <Switch
                    isChecked={settings.use_feeder}
                    onChange={(e) => updateSetting('use_feeder', e.target.checked)}
                    colorScheme="blue"
                  />
                </FormControl>
              )}

              {/* Nombre de pages */}
              {!settings.use_feeder && (
                <FormControl>
                  <FormLabel>Nombre de pages</FormLabel>
                  <NumberInput
                    value={settings.num_pages}
                    onChange={(_, val) => updateSetting('num_pages', val)}
                    min={1}
                    max={100}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Traitement d'images */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Traitement d'images</Heading>
              <Tooltip label="Améliore automatiquement la qualité des scans">
                <span>
                  <Icon as={FiInfo} color="gray.500" />
                </span>
              </Tooltip>
            </HStack>

            <VStack spacing={3} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1} fontSize="sm">
                  Détection automatique des bordures
                </FormLabel>
                <Switch
                  isChecked={settings.auto_border_detection}
                  onChange={(e) =>
                    updateSetting('auto_border_detection', e.target.checked)
                  }
                  colorScheme="blue"
                  size="sm"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1} fontSize="sm">
                  Redressement automatique
                </FormLabel>
                <Switch
                  isChecked={settings.auto_deskew}
                  onChange={(e) => updateSetting('auto_deskew', e.target.checked)}
                  colorScheme="blue"
                  size="sm"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1} fontSize="sm">
                  Réduction du bruit
                </FormLabel>
                <Switch
                  isChecked={settings.denoise}
                  onChange={(e) => updateSetting('denoise', e.target.checked)}
                  colorScheme="blue"
                  size="sm"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1} fontSize="sm">
                  Amélioration du contraste
                </FormLabel>
                <Switch
                  isChecked={settings.enhance_contrast}
                  onChange={(e) =>
                    updateSetting('enhance_contrast', e.target.checked)
                  }
                  colorScheme="blue"
                  size="sm"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1} fontSize="sm">
                  Netteté
                </FormLabel>
                <Switch
                  isChecked={settings.sharpen}
                  onChange={(e) => updateSetting('sharpen', e.target.checked)}
                  colorScheme="blue"
                  size="sm"
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* OCR */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Reconnaissance de texte (OCR)</Heading>
              <Tooltip label="Extrait le texte des documents scannés">
                <span>
                  <Icon as={FiInfo} color="gray.500" />
                </span>
              </Tooltip>
            </HStack>

            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Activer l'OCR
                </FormLabel>
                <Switch
                  isChecked={settings.perform_ocr}
                  onChange={(e) => updateSetting('perform_ocr', e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>

              {settings.perform_ocr && (
                <FormControl>
                  <FormLabel>Langue</FormLabel>
                  <Select
                    value={settings.ocr_language}
                    onChange={(e) => updateSetting('ocr_language', e.target.value)}
                  >
                    <option value="fra">Français</option>
                    <option value="eng">Anglais</option>
                    <option value="fra+eng">Français + Anglais</option>
                  </Select>
                </FormControl>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default ScanSettings;
