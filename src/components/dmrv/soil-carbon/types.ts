// ─── Shared Types for Soil Carbon DMRV ──────────────────────────

export interface TerraceLayer {
  id: string;
  plotId: string;
  layerNumber: number;
  cropType: string;
  widthM: number;
  plantingAreaWidthM: number;
  heightM: number;
  sedimentDepthCm: number;
  waterFlowInLpm: number;
  waterFlowOutLpm: number;
  sedimentTrappedKg: number;
  socPct: number;
  createdAt: string;
  ridgeWidthM: number;
  vetiverGrassStatus: string;
  vetiverRootDepthCm: number;
  vetiverPlantDensity: number;
  vetiverErosionPreventionPct: number;
  vetiverSedimentAccumulationKg: number;
  vetiverCarbonSequestrationKg: number;
}

export interface CheckDam {
  id: string;
  plotId: string;
  terraceLayerId: string;
  damType: string;
  heightM: number;
  widthM: number;
  sedimentTrappedKg: number;
  efficiency: number;
  createdAt: string;
}

export interface SoilCarbonPlot {
  id: string;
  plotId: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  areaRai: number;
  areaHa: number;
  landUseType: string;
  soilType: string;
  cropType: string;
  practiceType: string;
  baselineSOC: number;
  projectSOC: number;
  baselineEmission: number;
  projectEmission: number;
  emissionReduction: number;
  monitoringYear: number;
  status: string;
  methodology: string;
  createdAt: string;
  updatedAt: string;
  latestMeasurement?: SoilCarbonMeasurement | null;
  edgeNode?: { id: string; nodeId: string; name: string; nameTh: string; status: string } | null;
  altitudeMasl?: number;
  slopeDegree?: number;
  slopeAspect?: string;
  terraceCount?: number;
  terraceWidthM?: number;
  terraceHeightM?: number;
  checkDamCount?: number;
  checkDamType?: string;
  baselineSediment?: number;
  projectSediment?: number;
  previousLandUse?: string;
  vetiverGrassCoveragePct?: number;
  plantingAreaWidthM?: number;
  ridgeWidthMPlot?: number;
}

export interface SoilCarbonMeasurement {
  id: string;
  plotId: string;
  measurementDate: string;
  measurementType: string;
  depthCm: number;
  soilMoisture: number;
  soilTemperature: number;
  soilPH: number;
  bulkDensity: number;
  organicCarbonPct: number;
  totalNitrogen: number;
  cec: number;
  aboveGroundBiomass: number;
  belowGroundBiomass: number;
  socStock: number;
  co2Flux: number;
  ch4Flux: number;
  n2oFlux: number;
  ingestionMode: string;
  qualityFlag: string;
  integrityHash: string;
  sourceDevice: string;
  notes: string;
  createdAt: string;
  plot?: { plotId: string; name: string; nameTh: string; province: string; cropType: string; practiceType: string; areaHa: number };
  sedimentConcentration?: number;
  runoffVolumeL?: number;
  waterFlowRate?: number;
  infiltrationRate?: number;
  erosionRate?: number;
  terraceLayerId?: string;
}

export interface CalculationResult {
  grossCredits?: number;
  grossCreditsUnit?: string;
  bufferDeductionPct?: number;
  bufferDeduction?: number;
  netCredits?: number;
  netCreditsUnit?: string;
  annualNetCredits?: number;
  annualNetCreditsUnit?: string;
  creditValidityYears?: number;
}

export interface SedimentCalcResult extends CalculationResult {
  plotInfo?: { plotId: string; name: string; nameTh: string; province: string; areaHa: number; areaRai: number; cropType: string; practiceType: string; methodology: string };
  monitoringPeriod?: { start: string; end: string; years: number; measurementCount: number; validMeasurementCount: number };
  socStockChange?: { formula: string; deltaSOC: number; molecularRatio: number; areaHa: number; result: number; unit: string };
  sedimentTrapped?: { formula: string; totalSediment: number; socPct: number; molecularRatio: number; result: number; unit: string; byLayer: { layer: number; sedimentKg: number; socPct: number; credit: number }[] };
  checkDamCarbon?: { formula: string; totalSedimentBehindDam: number; molecularRatio: number; result: number; unit: string; byDam: { damType: string; sedimentKg: number; credit: number }[] };
  erosionPrevention?: { formula: string; baselineSediment: number; projectSediment: number; socPct: number; molecularRatio: number; result: number; unit: string };
  ghgReduction?: { formula: string; baselineEmission: number; projectEmission: number; areaHa: number; result: number; unit: string };
  creditSummary?: CalculationResult;
  coBenefits?: { flowReductionPct: number; runoffReductionLpm: number };
  assessment?: { eligible: boolean; methodology: string; uncertaintyDeduction: string; recommendations: string[] };
}

export interface CertificationRecord {
  plotId: string;
  plotName: string;
  plotNameTh: string;
  province: string;
  areaHa: number;
  status: string;
  methodology: string;
  monitoringYear: number;
  netCredits: number;
  certifiedAt?: string;
  certificateId?: string;
}
