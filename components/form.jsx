import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { saveAs } from "file-saver";
import Docxtemplater from "docxtemplater";

import styles from "../styles/Form.module.css";

const formFields = [
  { name: "name", placeholder: "Name" },
  { name: "lastName", placeholder: "Last Name" },
  { name: "someValue", placeholder: "Some Value" },
];

export const Form = () => {
  const [PizZip, setPizZip] = useState(null);
  const [PizZipUtils, setPizZipUtils] = useState(null);

  useEffect(() => {
    async function loadPizZip() {
      const PizZipModule = await import("../helpers/pizzipClient");
      setPizZip(() => PizZipModule.default);
      const PizZipUtilsModule = await import("pizzip/utils/index.js");
      setPizZipUtils(() => PizZipUtilsModule.default);
    }

    loadPizZip();
  }, []);

  function loadFile(url, callback) {
    if (PizZipUtils) {
      PizZipUtils.getBinaryContent(url, callback);
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  console.log(styles.input);

  const generateDocument = (data) => {
    if (PizZip) {
      loadFile("./files/tag-example.docx", function (error, content) {
        if (error) {
          throw error;
        }
        var zip = new PizZip(content);
        var doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        doc.setData({
          first_name: data.name,
          last_name: data.lastName,
          phone: "+1-000-111-1212",
          description: "Some description",
        });
        try {
          // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
          doc.render();
        } catch (error) {
          // The error thrown here contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
          function replaceErrors(key, value) {
            if (value instanceof Error) {
              return Object.getOwnPropertyNames(value).reduce(function (
                error,
                key
              ) {
                error[key] = value[key];
                return error;
              },
              {});
            }
            return value;
          }
          console.log(JSON.stringify({ error: error }, replaceErrors));

          if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors
              .map(function (error) {
                return error.properties.explanation;
              })
              .join("\n");
            console.log("errorMessages", errorMessages);
            // errorMessages is a humanly readable message looking like this :
            // 'The tag beginning with "foobar" is unopened'
          }
          throw error;
        }
        var out = doc.getZip().generate({
          type: "blob",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }); //Output the document using Data-URI
        saveAs(out, "output.docx");
      });
    }
  };

  const errorMessage = Object.keys(errors).reduce(
    (msg, key, keyIndex, arr) =>
      msg + errors[key].message + (keyIndex < arr.length - 1 ? ", " : ""),

    []
  );

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit(generateDocument)}>
        {formFields.map((field) => (
          <input
            type="text"
            className={
              errors[field.name]
                ? `${styles.input} ${styles.inputError}`
                : styles.input
            }
            placeholder={field.placeholder}
            name={field.name}
            key={`input-${field.name}`}
            {...register(field.name, {
              required: `${field.placeholder} is required`,
            })}
          ></input>
        ))}

        <div className={styles.buttonContainer}>
          <button className={styles.button}>Generate document</button>
        </div>
        {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
      </form>
    </div>
  );
};
