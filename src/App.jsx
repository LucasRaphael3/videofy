import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import BatchUploader from './components/BatchUploader';
import VideoQueue from './components/VideoQueue';
import LivePreviewPlayer from './components/LivePreviewPlayer';
import GlobalModifiers from './components/GlobalModifiers';
import BatchProgressModal from './components/BatchProgressModal';
import AuthModal from './components/AuthModal';
import UpgradeModal from './components/UpgradeModal';
import { useAccount } from './lib/useAccount';
import { allowsQuality, fallbackQuality } from './lib/plans';
import { 
  extractVideoMetadata, 
  processBatchConcurrently, 
  createBatchZip,
  EXPORT_QUALITY_PRESETS,
  saveFileBlob 
} from './utils/videoProcessor';
import { generateSampleBatch } from './utils/sampleVideos';

export default function App() {
  const account = useAccount();
  const { plan } = account;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null); // null = closed
  const pendingStartRef = useRef(false);
  const qualityTouchedRef = useRef(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [activeTab, setActiveTab] = useState('captions');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);

  // Global Caption Modifiers
  const [captionSettings, setCaptionSettings] = useState({
    text: 'WAIT FOR THE END 😱🔥',
    fontFamily: 'Bebas Neue',
    fontSize: 60,
    fontWeight: '700',
    textTransform: 'uppercase',
    textColor: '#FFE600',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowBlur: 14,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    boxBg: 'transparent',
    boxPadding: 16,
    boxRadius: 10,
    position: 'center',
    yOffset: 0,
    textAlign: 'center',
  });

  // Global Account Landmark (Watermark) Modifiers
  const [watermarkSettings, setWatermarkSettings] = useState({
    type: 'text', // 'logo' | 'text'
    text: '@videofy.creator',
    anchor: 'top-right',
    scale: 18,
    opacity: 85,
    margin: 32,
    textColor: '#ffffff',
    fontSize: 28,
    fontFamily: 'Montserrat',
    badgeBg: 'rgba(0, 0, 0, 0.45)',
    badgeRadius: 8,
  });

  const [watermarkImgPreview, setWatermarkImgPreview] = useState('');
  const [watermarkImgElement, setWatermarkImgElement] = useState(null);

  // Global Twitter / X Meme Card Settings
  const [tweetCardSettings, setTweetCardSettings] = useState({
    enabled: false,
    mode: 'frame', // 'frame' (9:16 vertical canvas with tweet header and video fitted) | 'overlay' (floating tweet card)
    bgType: 'white', // 'white' | 'black' | 'dim' | 'blur' | 'custom'
    bgColor: '#ffffff',
    customGradient: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
    displayName: 'BALLERS',
    handle: '@ballers',
    verified: true,
    verifiedType: 'blue', // 'blue' | 'gold' | 'none'
    text: 'Anthony finally used his spin move usefully 😱🔥',
    fontSize: 32,
    fontFamily: 'Inter',
    timestamp: '10:00 PM · 15/09/2026',
    showTimestamp: true,
    videoBorderRadius: 16,
    cardRadius: 16,
    xPercent: 50,
    yPercent: 18,
    scale: 92,
    // Video Cropping, Zooming & Framing inside 9:16 Card
    videoFit: 'cover', // 'cover' | 'contain' | 'square' | 'custom'
    videoScale: 100, // 70% to 200% zoom
    videoHeightPercent: 48, // 30% to 75% height allocation
    videoCropOffsetY: 50, // 0% (top) to 100% (bottom), 50 = center
    videoCropOffsetX: 50, // 0% (left) to 100% (right), 50 = center
    videoFlush: true,
  });

  const [tweetAvatarPreview, setTweetAvatarPreview] = useState('');
  const [tweetAvatarImgElement, setTweetAvatarImgElement] = useState(null);

  // Engine Settings
  const [exportQuality, setExportQualityState] = useState('high'); // 'ultra' | 'high' | 'balanced' | 'economy'
  const setExportQuality = (id) => { qualityTouchedRef.current = true; setExportQualityState(id); };

  // Free accounts start on the best quality they can export, unless the user picked one
  useEffect(() => {
    if (!qualityTouchedRef.current) setExportQualityState((q) => fallbackQuality(plan, q));
  }, [plan]);
  const [concurrency, setConcurrency] = useState(1);
  const [preserveAudio, setPreserveAudio] = useState(true);

  // Batch Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);

  // Selected video object for WYSIWYG player
  const selectedVideo = videos.find((v) => v.id === selectedVideoId) || videos[0] || null;

  // Handle Logo Upload
  const handleLogoUploaded = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setWatermarkImgPreview(previewUrl);

    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      setWatermarkImgElement(img);
      setWatermarkSettings((prev) => ({ ...prev, type: 'logo' }));
    };
  };

  const handleClearLogo = () => {
    if (watermarkImgPreview) {
      URL.revokeObjectURL(watermarkImgPreview);
    }
    setWatermarkImgPreview('');
    setWatermarkImgElement(null);
    setWatermarkSettings((prev) => ({ ...prev, type: 'text' }));
  };

  // Handle Tweet Avatar Upload
  const handleTweetAvatarUploaded = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setTweetAvatarPreview(previewUrl);

    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      setTweetAvatarImgElement(img);
    };
  };

  const handleClearTweetAvatar = () => {
    if (tweetAvatarPreview) {
      URL.revokeObjectURL(tweetAvatarPreview);
    }
    setTweetAvatarPreview('');
    setTweetAvatarImgElement(null);
  };

  // Add video files to queue
  const handleFilesSelected = async (files) => {
    setIsExtracting(true);
    const newItems = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const metadata = await extractVideoMetadata(file);
        const item = {
          id: 'v_' + Math.random().toString(36).substr(2, 9),
          file,
          metadata,
          status: 'idle',
          progress: 0,
          result: null,
          error: null,
        };
        newItems.push(item);
      } catch (err) {
        console.error('Erro ao ler metadados do arquivo', file.name, err);
      }
    }

    setVideos((prev) => {
      const updated = [...prev, ...newItems];
      if (!selectedVideoId && updated.length > 0) {
        setSelectedVideoId(updated[0].id);
      }
      return updated;
    });

    setIsExtracting(false);
  };

  // Generate synthetic sample cuts
  const handleGenerateSamples = async () => {
    setIsGeneratingSamples(true);
    try {
      const sampleFiles = await generateSampleBatch();
      await handleFilesSelected(sampleFiles);
    } catch (err) {
      console.error('Falha ao gerar cortes de amostra:', err);
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  // Remove single video
  const handleRemoveVideo = (id) => {
    setVideos((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      if (selectedVideoId === id) {
        setSelectedVideoId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  // Clear queue
  const handleClearQueue = () => {
    setVideos([]);
    setSelectedVideoId(null);
    setOverallProgress(0);
    setCompletedCount(0);
  };

  // Start Batch Render. Checks login and plan limits first.
  // acceptFree: the user chose to render within the free plan (first N cuts, 720p).
  const handleStartBatch = async ({ acceptFree = false } = {}) => {
    if (videos.length === 0 || isProcessing) return;

    if (!account.isSignedIn) {
      pendingStartRef.current = true;
      setIsAuthOpen(true);
      return;
    }

    const overBatch = videos.length > plan.maxBatch;
    const lockedQuality = !allowsQuality(plan, exportQuality);
    if (!acceptFree && (overBatch || lockedQuality)) {
      setUpgradeReason(overBatch
        ? { kind: 'batch', total: videos.length, max: plan.maxBatch }
        : { kind: 'quality', label: EXPORT_QUALITY_PRESETS[exportQuality]?.label || exportQuality });
      return;
    }
    setUpgradeReason(null);

    const batch = videos.slice(0, plan.maxBatch);
    const quality = fallbackQuality(plan, exportQuality);
    setBatchTotal(batch.length);

    setIsProcessing(true);
    setIsModalOpen(true);
    setOverallProgress(0);
    setCompletedCount(0);

    // Reset progress on all items
    setVideos((prev) =>
      prev.map((v) => ({ ...v, status: 'idle', progress: 0, result: null, error: null }))
    );

    try {
      await processBatchConcurrently({
        videos: batch,
        captionSettings,
        watermarkSettings,
        watermarkImgElement,
        tweetCardSettings,
        tweetAvatarImgElement,
        exportQuality: quality,
        concurrency,
        preserveAudio,
        branding: plan.branding,
        onItemProgress: (itemId, percent, status) => {
          setVideos((prev) =>
            prev.map((v) => (v.id === itemId ? { ...v, progress: percent, status } : v))
          );
        },
        onItemComplete: (itemId, result) => {
          setVideos((prev) =>
            prev.map((v) => (v.id === itemId ? { ...v, status: 'completed', result } : v))
          );
        },
        onItemError: (itemId, error) => {
          setVideos((prev) =>
            prev.map((v) => (v.id === itemId ? { ...v, status: 'failed', error } : v))
          );
        },
        onBatchProgress: (percent, completed, total) => {
          setOverallProgress(percent);
          setCompletedCount(completed);
        },
      });

    } catch (err) {
      console.error('Erro na renderização em lote:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Resume the render the user asked for once login finishes
  const handleSignedIn = useCallback(() => {
    setIsAuthOpen(false);
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      setTimeout(() => document.getElementById('start-batch')?.click(), 0);
    }
  }, []);

  // Download All as ZIP
  const handleDownloadZip = async () => {
    const completedVideos = videos.filter((v) => v.status === 'completed' && v.result);
    if (completedVideos.length === 0 || isZipping) return;

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zipBlob = await createBatchZip(completedVideos, (percent) => {
        setZipProgress(percent);
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const zipName = `videofy_batch_export_${dateStr}.zip`;
      saveFileBlob(zipBlob, zipName);
    } catch (err) {
      console.error('Erro ao gerar arquivo ZIP:', err);
      alert('Falha ao gerar arquivo ZIP compactado.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header */}
      <Header
        totalVideos={videos.length}
        completedVideos={videos.filter((v) => v.status === 'completed').length}
        onGenerateSamples={handleGenerateSamples}
        isGeneratingSamples={isGeneratingSamples}
        onStartBatch={handleStartBatch}
        isProcessing={isProcessing}
        hasActiveQueue={videos.length > 0}
        account={account}
        onSignIn={() => setIsAuthOpen(true)}
        onShowPlans={() => setUpgradeReason({ kind: 'branding' })}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Upload Zone */}
        <BatchUploader
          onFilesSelected={handleFilesSelected}
          isExtracting={isExtracting}
          videoCount={videos.length}
        />

        {/* Studio Grid: Modifiers on Left, Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Global Modifiers (Captions, Landmark Watermark, Tweet Card, Engine) */}
          <div className="lg:col-span-7 space-y-6">
            <GlobalModifiers
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              captionSettings={captionSettings}
              setCaptionSettings={setCaptionSettings}
              watermarkSettings={watermarkSettings}
              setWatermarkSettings={setWatermarkSettings}
              watermarkImgPreview={watermarkImgPreview}
              setWatermarkImgPreview={setWatermarkImgPreview}
              onLogoUploaded={handleLogoUploaded}
              onClearLogo={handleClearLogo}
              tweetCardSettings={tweetCardSettings}
              setTweetCardSettings={setTweetCardSettings}
              tweetAvatarPreview={tweetAvatarPreview}
              onTweetAvatarUploaded={handleTweetAvatarUploaded}
              onClearTweetAvatar={handleClearTweetAvatar}
              exportQuality={exportQuality}
              setExportQuality={setExportQuality}
              concurrency={concurrency}
              setConcurrency={setConcurrency}
              preserveAudio={preserveAudio}
              setPreserveAudio={setPreserveAudio}
              lockedQualities={Object.keys(EXPORT_QUALITY_PRESETS).filter((id) => !allowsQuality(plan, id))}
            />
          </div>

          {/* Right Column: WYSIWYG Real-time Live Preview Player */}
          <div className="lg:col-span-5">
            <LivePreviewPlayer
              videoItem={selectedVideo}
              captionSettings={captionSettings}
              setCaptionSettings={setCaptionSettings}
              watermarkSettings={watermarkSettings}
              setWatermarkSettings={setWatermarkSettings}
              watermarkImgElement={watermarkImgElement}
              onClearLogo={handleClearLogo}
              tweetCardSettings={tweetCardSettings}
              setTweetCardSettings={setTweetCardSettings}
              tweetAvatarImgElement={tweetAvatarImgElement}
              onClearTweetAvatar={handleClearTweetAvatar}
              branding={plan.branding}
            />
          </div>
        </div>

        {/* Video Queue List / Cards */}
        <VideoQueue
          videos={videos}
          selectedVideoId={selectedVideoId}
          onSelectVideo={setSelectedVideoId}
          onRemoveVideo={handleRemoveVideo}
          onClearQueue={handleClearQueue}
          isProcessing={isProcessing}
        />
      </main>

      {/* Batch Rendering & Export Modal */}
      <BatchProgressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isProcessing={isProcessing}
        overallProgress={overallProgress}
        completedCount={completedCount}
        totalCount={batchTotal || videos.length}
        videos={batchTotal ? videos.slice(0, batchTotal) : videos}
        onDownloadZip={handleDownloadZip}
        isZipping={isZipping}
        zipProgress={zipProgress}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => { pendingStartRef.current = false; setIsAuthOpen(false); }}
        onGoogle={account.signInWithGoogle}
        onEmail={account.signInWithEmail}
        isSignedIn={account.isAuthConfigured && Boolean(account.session)}
        onSignedIn={handleSignedIn}
      />

      <UpgradeModal
        isOpen={Boolean(upgradeReason)}
        reason={upgradeReason}
        email={account.email}
        onClose={() => setUpgradeReason(null)}
        onContinueFree={upgradeReason && upgradeReason.kind !== 'branding' ? () => handleStartBatch({ acceptFree: true }) : null}
      />
    </div>
  );
}
