document.getElementById('loginButton').addEventListener('click', function (e) {
    e.preventDefault();
    const userType = document.getElementById('UserType').value;
    if (!userType) {
        alert('Please select a user type.');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                transferData = {
                    userType,
                    latitude,
                    longitude,
                };

                // Send transferData to the server
                fetch('/location', {
                    method: 'POST',
                    body: JSON.stringify(transferData),
                    headers: { 'Content-Type': 'application/json' },
                })
                    .then((response) => response.json())
                    .then((data) => {
                        console.log('Server response:', data);
                        alert('Location successfully sent')
                    })
                    .catch((error) => {
                        console.error('Error sending data:', error);
                    });
            },
            function (error) {
                console.error('Error obtaining geolocation:', error);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }