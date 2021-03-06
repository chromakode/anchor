import * as React from 'react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  ForwardedRef,
} from 'react'
import {
  chakra,
  Flex,
  Grid,
  HStack,
  IconButton,
  AspectRatio,
  Spinner,
  useTheme,
  Slider,
  SliderFilledTrack,
  SliderTrack,
} from '@chakra-ui/react'
import { transparentize } from '@chakra-ui/theme-tools'
import Hls from 'hls.js'
import {
  FaCompress,
  FaExpand,
  FaPause,
  FaPlay,
  FaVolumeMute,
  FaVolumeOff,
} from 'react-icons/fa'

const DEFAULT_VOLUME = 0.65
const LAST_VOLUME_KEY = 'last_volume'

const VideoEl = chakra('video')

function ControlButton(props: React.ComponentProps<typeof IconButton>) {
  return (
    <IconButton
      colorScheme="gray"
      background="gray.950"
      _hover={{ background: 'gray.700' }}
      _active={{ background: 'gray.900' }}
      variant="outline"
      {...props}
    />
  )
}

type VideoProps = React.ComponentProps<typeof VideoEl> & { onUnmute: () => {} }
const Video = forwardRef(
  (
    { src, onUnmute, ...props }: VideoProps,
    ref: ForwardedRef<HTMLVideoElement>,
  ) => {
    const theme = useTheme()
    const videoHighlightColor = transparentize('orangeYellow.300', 0.15)(theme)
    const containerRef = useRef<HTMLDivElement>()
    const videoRef = useRef<HTMLVideoElement>()
    const [isWaiting, setIsWaiting] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isInteractingControls, setIsInteractingControls] = useState(true)

    function handlePlay() {
      videoRef.current?.play()
    }

    function handlePause() {
      videoRef.current?.pause()
    }

    function handleMute() {
      if (videoRef.current) {
        videoRef.current.muted = true
      }
    }

    function handleUnmute() {
      const vid = videoRef.current
      if (vid) {
        vid.muted = false
        if (vid.volume === 0) {
          vid.volume = DEFAULT_VOLUME
        }
      }
      onUnmute?.()
    }

    function handleChangeVolume(value) {
      if (videoRef.current) {
        videoRef.current.volume = value
        videoRef.current.muted = false
      }
      setIsMuted(value === 0 ? true : false)
      setVolume(value)
      localStorage.setItem(LAST_VOLUME_KEY, value)
    }

    function handleFullscreen() {
      containerRef.current?.requestFullscreen()
    }

    function handleExitFullscreen() {
      document.exitFullscreen()
    }

    function handleDoubleClick(ev: React.MouseEvent) {
      if (ev.target instanceof Element && !!ev.target.closest('button')) {
        return
      }
      if (isFullscreen) {
        handleExitFullscreen()
      } else {
        handleFullscreen()
      }
    }

    function handleShowControls() {
      setIsInteractingControls(true)
    }
    useEffect(() => {
      if (!isInteractingControls) {
        return
      }
      const timeout = setTimeout(() => {
        setIsInteractingControls(false)
      }, 5 * 1000)
      return () => clearTimeout(timeout)
    }, [isInteractingControls])

    useEffect(() => {
      const video = videoRef.current

      video.volume = Number(
        localStorage.getItem(LAST_VOLUME_KEY) || String(DEFAULT_VOLUME),
      )

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.addEventListener('loadedmetadata', () => {
          video.play()
        })
      } else if (Hls.isSupported()) {
        var hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play()
        })
      }

      function play() {
        setIsPlaying(true)
      }

      function pause() {
        setIsPlaying(false)
      }

      function setWaiting() {
        setIsWaiting(true)
      }

      function setNotWaiting() {
        setIsWaiting(false)
      }

      function updateVolume() {
        setVolume(video.muted ? 0 : video.volume)
        setIsMuted(video.muted || video.volume === 0)
      }

      function updateFullscreen(ev) {
        setIsFullscreen(document.fullscreenElement === ev.currentTarget)
      }

      video.addEventListener('play', play)
      video.addEventListener('pause', pause)
      video.addEventListener('waiting', setWaiting)
      video.addEventListener('playing', setNotWaiting)
      video.addEventListener('volumechange', updateVolume)
      containerRef.current.addEventListener(
        'fullscreenchange',
        updateFullscreen,
      )

      updateVolume()

      return () => {
        video?.removeEventListener('play', play)
        video?.removeEventListener('pause', pause)
        video?.removeEventListener('waiting', setWaiting)
        video?.removeEventListener('playing', setNotWaiting)
        video?.removeEventListener('volumechange', updateVolume)
        containerRef.current?.removeEventListener(
          'fullscreenchange',
          updateFullscreen,
        )
      }
    }, [src])

    useImperativeHandle(ref, () => videoRef.current)

    const showControls = isInteractingControls || isWaiting

    return (
      <AspectRatio
        width="full"
        maxHeight="full"
        ratio={16 / 9}
        boxShadow="0 0 4rem black inset"
      >
        <Flex ref={containerRef}>
          <Grid
            position="absolute"
            left="0"
            top="0"
            right="0"
            bottom="0"
            height="full"
            p={2}
            templateRows="repeat(3, 1fr)"
            templateColumns="repeat(3, 1fr)"
            alignItems="end"
            onMouseMove={handleShowControls}
            onTouchStart={handleShowControls}
            onMouseOut={() => setIsInteractingControls(false)}
            onDoubleClick={handleDoubleClick}
            opacity={showControls ? 0.9 : 0}
            transitionProperty="opacity"
            transitionDuration="normal"
            _hover={{
              boxShadow: `0 0 20px ${videoHighlightColor} inset`,
            }}
            zIndex={100}
          >
            <Spinner
              gridArea="2 / 2"
              alignSelf="center"
              justifySelf="center"
              boxSize={24}
              opacity={isWaiting ? 1 : 0}
              transitionProperty="opacity"
              transitionDuration="normal"
            />
            <ControlButton
              gridArea="3 / 2"
              justifySelf="center"
              onClick={isPlaying ? handlePause : handlePlay}
              icon={isPlaying ? <FaPause /> : <FaPlay />}
              size="lg"
              fontSize="3xl"
              boxSize={20}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            />
            <HStack
              gridArea="3 / 3"
              alignItems="flex-end"
              justifyContent="flex-end"
            >
              <Flex flexDirection="column">
                <Slider
                  colorScheme="gray"
                  size="lg"
                  h="20"
                  min={0}
                  max={1}
                  step={0.01}
                  orientation="vertical"
                  value={volume}
                  onChange={handleChangeVolume}
                  opacity={isMuted ? 0 : 1}
                  transitionProperty="opacity"
                  transitionDuration="normal"
                >
                  <SliderTrack
                    bg="gray.700"
                    borderColor="flame.800"
                    borderWidth="1px"
                    borderStyle="solid"
                    w={3}
                    borderRadius="full"
                  >
                    <SliderFilledTrack bg="flame.600" />
                  </SliderTrack>
                </Slider>
                <ControlButton
                  onClick={isMuted ? handleUnmute : handleMute}
                  icon={isMuted ? <FaVolumeMute /> : <FaVolumeOff />}
                  size="md"
                  mt="2"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  {...(isMuted && {
                    bg: 'deepRed.700',
                    _hover: { bg: 'deepRed.600' },
                    _active: { bg: 'gray.600' },
                  })}
                />
              </Flex>
              <ControlButton
                onClick={isFullscreen ? handleExitFullscreen : handleFullscreen}
                icon={isFullscreen ? <FaCompress /> : <FaExpand />}
                size="md"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              />
            </HStack>
          </Grid>
          <VideoEl
            key={src}
            ref={videoRef}
            opacity={isPlaying ? 1 : 0.5}
            transitionProperty="opacity"
            transitionDuration="faster"
            width="full"
            height="full"
            {...props}
          />
        </Flex>
      </AspectRatio>
    )
  },
)

export default Video
