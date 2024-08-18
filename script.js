const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });


document.getElementById('video-upload').addEventListener('change', async function(event) {
    const videoFile = event.target.files[0];
    if (!videoFile) {
        console.error('No file selected.');
        return;
    }

    if (!ffmpeg.isLoaded()) {
        try {
            await ffmpeg.load();
        } catch (err) {
            console.error('Failed to load ffmpeg.wasm', err);
            return;
        }
    }

    try {

        document.querySelector('.info-container').style.display = 'none';
        document.querySelector('.upload-input').style.display = 'none';
        document.querySelector('.space-div-2').style.display = 'none';
        document.querySelector('.space-div-3').style.display = 'none';
        document.getElementById('loader-wrapper').hidden = false ;
        var frameCount = document.getElementById('loop-count');

        const videoData = await fetchFile(videoFile);
        ffmpeg.FS('writeFile', 'input.mp4', videoData);
        let count = 0;

        // Start the frame count timer
        const frameCounter = setInterval(() => {
            count++;
            frameCount.innerText = count;
        }, 1000);
        // Extract frames at 1 frame per second
        await ffmpeg.run('-i', 'input.mp4', '-vf', 'fps=1', 'output_%04d.jpg');

        clearInterval(frameCounter);

        const framesContainer = document.getElementById('frames-container');
        framesContainer.innerHTML = ''; // Clear previous frames

        const files = ffmpeg.FS('readdir', '/');
        const frameFiles = files.filter(file => file.endsWith('.jpg'));


        // Get the total number of frames
        const totalFrames = frameFiles.length;

        // Slow increase of the count to match the total frame count
        let currentFrameCount = count;

        const slowCounter = setInterval(() => {
        if (currentFrameCount < totalFrames) {
            currentFrameCount++;
            frameCount.innerText = currentFrameCount;
            } else {
            clearInterval(slowCounter);  // Stop the counter when it matches the total frames
            }
        }, 100); 

        const loader = document.querySelector('.loader');
        loader.style.animation = 'none'; // Stops the animation

        let zip = new JSZip();
        
        for (let i = 0; i < frameFiles.length; i++) {
            const frameFile = frameFiles[i];
            const data = ffmpeg.FS('readFile', frameFile);            
            zip.file(frameFile, data.buffer);
        }
        var downloadButton =  document.getElementById('download-btn');
        downloadButton.disabled = false;
        downloadButton.hidden = false;

        document.getElementById('download-btn').addEventListener('click', function() {
            zip.generateAsync({ type: 'blob' }).then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'frames.zip';
                link.click();
            });
        });
    } catch (err) {
        console.error('Error processing video:', err);
    }
});
