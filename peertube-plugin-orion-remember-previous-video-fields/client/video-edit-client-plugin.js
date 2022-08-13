const PREVIOUS_STORAGE_KEY = 'orionPreviousFieldsValues';
const defaultPreviousFieldsValues = {
  _category: '',
  description: '',
  _language: '',
  _licence: '',
  nsfw: '',
  _privacy: '',
};
const tempSelectValue = {};

function register({ registerHook, peertubeHelpers }) {
  registerHook({
    target: 'action:video-edit.init',
    handler: ({ type }) => {
      if(type != "upload" && type != "go-live")
        return;

      const timer = setInterval(() => {
        // Check if current location contain /upload, else clear timer
        if(window.location.href.indexOf('/upload') == -1) {
          clearInterval(timer);
          return;
        }

        // Wait for hidden not exist
        if(!document.querySelector('form').hasAttribute('hidden')) {
          clearInterval(timer);
          setTimeout(init, 500);
        }
      }, 300);
    }
  })
}

export {
  register
}

function init() {
  fillFormFields();

  const publishButton = document.querySelector("[label='Publier']");
  publishButton.addEventListener('click', onSubmitSaveFieldsValues);

  // Listen hover all select fields
  const selects = Object.keys(defaultPreviousFieldsValues).filter(fieldName => fieldName.startsWith('_'));
  selects.forEach(select => {
    const field = document.getElementById(select.substring(1));
    field.parentNode.parentNode.addEventListener('click', () => {
      setTimeout(() => {
        const selectOpenedOptions = field.parentNode.parentNode.parentNode.nextSibling.childNodes[1].childNodes[1];
        if(selectOpenedOptions) {
          // For each child, click event
          selectOpenedOptions.childNodes.forEach(child => {
            if(!child || !child.id) return;

            child.addEventListener('click', () => {
              let id = child.id.split("-")[1];
              tempSelectValue[select] = id;
            });
          });
        }
      }, 100);
    });
  });
}

function onSubmitSaveFieldsValues() {
  const form = document.querySelector('form');
  const fields = form.querySelectorAll('input, textarea');
  const fieldsValues = {};
  fields.forEach(field => {
    if(!field || !field.id) return;

    const availableOptions = Object.keys(defaultPreviousFieldsValues).map(fieldName => fieldName.startsWith('_') ? fieldName.substring(1) : fieldName);

    // Check if field exist in default values
    if (availableOptions.includes(field.id)) {
      // Search real option name
      const fieldName = Object.keys(defaultPreviousFieldsValues).find(fieldName => fieldName === field.id || fieldName === `_${field.id}`);

      // Checkbox
      if (field.type === 'checkbox') {
        fieldsValues[fieldName] = field.checked;

      }else if (fieldName.startsWith('_')) {
        fieldsValues[fieldName] = tempSelectValue[fieldName];

      // Other fields
      } else {
        fieldsValues[fieldName] = field.value;
      }
      
    }
  });

  localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(fieldsValues));
}


function getPreviousFieldsValues() {
  // replace default values with previous values
  const previousFieldsValues = JSON.parse(localStorage.getItem(PREVIOUS_STORAGE_KEY)) || defaultPreviousFieldsValues;

  // Return values
  return previousFieldsValues;
}

function fillFormFields() {
  // Get previous values
  const previousFieldsValues = getPreviousFieldsValues();

  // Fill form fields
  let wait = false;
  Object.keys(previousFieldsValues).forEach(fieldName => {
    const fieldId = fieldName;

    let isSelect = false;
    if(fieldName.startsWith('_')) {
      fieldName = fieldName.substring(1);
      isSelect = true;
    }

    const field = document.getElementById(fieldName);

    if (field) {
      // Checkbox
      if (typeof previousFieldsValues[fieldId] === 'boolean') {
        field.checked = previousFieldsValues[fieldId];

      // Select
      }else if (isSelect) {
        if(!previousFieldsValues[fieldId]) return;

        const doJob = (field) => {
          if(wait) {
            setTimeout(() => doJob(field), 1000);
            return;
          }

          wait = true;
          field.parentNode.parentNode.parentNode.getElementsByClassName("ng-arrow")[0].dispatchEvent(new CustomEvent('mousedown', { bubbles: true }))
          setTimeout(() => {
            try {
              const selectOpenedOptions = field.parentNode.parentNode.parentNode.nextSibling.childNodes[1].childNodes[1];
              if(selectOpenedOptions) {
                for(let i = 0; i < selectOpenedOptions.childNodes.length; i++) {
                  const child = selectOpenedOptions.childNodes[i];
                  if(!child || !child.id) return;
  
                  let id = child.id.split("-")[1];
                  if(id == previousFieldsValues[fieldId]) {
                    tempSelectValue[fieldId] = id;
                    child.click();
                    break;
                  }
                }
  
                setTimeout(() => {
                  wait = false;
                }, 500);
              }
            }
            catch(e) {
              wait = false;
              doJob(field);
            }
          }, 500);
        };

        doJob(field);

      // Other fields
      }else{
        if(!previousFieldsValues[fieldId]) return;
        field.value = previousFieldsValues[fieldId];
      }

      field.dispatchEvent(new Event('input'));
      field.dispatchEvent(new Event('change'));
    }
  });
}