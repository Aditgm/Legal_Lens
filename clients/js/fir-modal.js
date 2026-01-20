window.populateFIRModal = function(details) {
  document.getElementById('edit-complainant-name').value = details.complainant_name || '';
  document.getElementById('edit-complainant-address').value = details.complainant_address || '';
  document.getElementById('edit-complainant-phone').value = details.complainant_phone || '';
  document.getElementById('edit-incident-date').value = formatDateForInput(details.incident_date);
  document.getElementById('edit-incident-time').value = details.incident_time || '';
  document.getElementById('edit-incident-location').value = details.incident_location || '';
  document.getElementById('edit-harassment-type').value = details.harassment_type || '';
  document.getElementById('edit-accused-name').value = details.accused_name || '';
  document.getElementById('edit-accused-description').value = details.accused_description || '';
  document.getElementById('edit-incident-description').value = details.incident_description || '';
  document.getElementById('edit-witnesses').value = details.witnesses || '';
  document.getElementById('edit-evidence').value = details.evidence || '';
};

window.closeFIRModal = function() {
  document.getElementById('fir-preview-modal').style.display = 'none';
};

window.downloadFIRFromModal = async function() {
  const modal = document.getElementById('fir-preview-modal');
  const downloadBtn = modal.querySelector('.btn-primary');
  
  try {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '⏳ Generating PDF...';

    // Get edited values from modal
    const editedDetails = {
      complainant_name: document.getElementById('edit-complainant-name').value,
      complainant_address: document.getElementById('edit-complainant-address').value,
      complainant_phone: document.getElementById('edit-complainant-phone').value,
      incident_date: document.getElementById('edit-incident-date').value,
      incident_time: document.getElementById('edit-incident-time').value,
      incident_location: document.getElementById('edit-incident-location').value,
      harassment_type: document.getElementById('edit-harassment-type').value,
      accused_name: document.getElementById('edit-accused-name').value,
      accused_description: document.getElementById('edit-accused-description').value,
      incident_description: document.getElementById('edit-incident-description').value,
      witnesses: document.getElementById('edit-witnesses').value,
      evidence: document.getElementById('edit-evidence').value
    };

    const response = await fetch('http://localhost:5000/api/chat/generate-fir-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'default',
        language: window.currentFIRData.language,
        firDetails: editedDetails
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Auto-download
      window.open(`http://localhost:5000${data.downloadUrl}`, '_blank');
      alert(`✅ ${window.currentFIRData.languageName} FIR PDF downloaded successfully!`);
      closeFIRModal();
    } else {
      alert('Error generating PDF: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '📥 Download PDF';
  }
};

window.emailFIR = async function() {
  const emailInput = document.getElementById('user-email');
  const email = emailInput.value.trim();
  
  if (!email) {
    alert('Please enter your email address');
    emailInput.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address');
    emailInput.focus();
    return;
  }

  const modal = document.getElementById('fir-preview-modal');
  const emailBtn = modal.querySelector('.btn-email');
  
  try {
    emailBtn.disabled = true;
    emailBtn.innerHTML = '⏳ Sending Email...';

    const editedDetails = {
      complainant_name: document.getElementById('edit-complainant-name').value,
      complainant_address: document.getElementById('edit-complainant-address').value,
      complainant_phone: document.getElementById('edit-complainant-phone').value,
      incident_date: document.getElementById('edit-incident-date').value,
      incident_time: document.getElementById('edit-incident-time').value,
      incident_location: document.getElementById('edit-incident-location').value,
      harassment_type: document.getElementById('edit-harassment-type').value,
      accused_name: document.getElementById('edit-accused-name').value,
      accused_description: document.getElementById('edit-accused-description').value,
      incident_description: document.getElementById('edit-incident-description').value,
      witnesses: document.getElementById('edit-witnesses').value,
      evidence: document.getElementById('edit-evidence').value
    };

    const response = await fetch('http://localhost:5000/api/chat/email-fir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'default',
        language: window.currentFIRData.language,
        firDetails: editedDetails,
        recipientEmail: email
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`✅ FIR sent to ${email}\nPlease check your inbox (and spam folder).`);
      closeFIRModal();
    } else {
      alert('Error sending email: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to send email. Please try again or download the PDF instead.');
  } finally {
    emailBtn.disabled = false;
    emailBtn.innerHTML = '📧 Email FIR';
  }
};
function formatDateForInput(dateString) {
  if (!dateString || dateString === 'Not Provided') return '';
  
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }
  
  return '';
}

window.addEventListener('click', function(event) {
  const modal = document.getElementById('fir-preview-modal');
  if (event.target === modal) {
    window.closeFIRModal();
  }
});
