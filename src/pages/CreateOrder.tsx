import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AlbumUpload } from "@/components/order/AlbumUpload";
import { OrderForm } from "@/components/order/OrderForm";
import { Steps, StepList, Step, StepIndicator, StepStatus, StepTitle, StepDescription, StepSeparator } from "@/components/ui/steps";
import { Card } from "@/components/ui/card";

const CreateOrder = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [albumName, setAlbumName] = useState("");
  const [albumFile, setAlbumFile] = useState<File | null>(null);

  const handleAlbumUploaded = (name: string, file: File) => {
    setAlbumName(name);
    setAlbumFile(file);
    setCurrentStep(2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Create New Order</h1>

        <Steps value={currentStep} className="mb-8">
          <StepList>
            <Step value={1}>
              <StepIndicator>
                <StepStatus
                  complete={<span className="text-white">1</span>}
                  incomplete={<span>1</span>}
                />
              </StepIndicator>
              <div className="ml-3">
                <StepTitle>Album Upload</StepTitle>
                <StepDescription>Upload your album file</StepDescription>
              </div>
              <StepSeparator />
            </Step>
            <Step value={2}>
              <StepIndicator>
                <StepStatus
                  complete={<span className="text-white">2</span>}
                  incomplete={<span>2</span>}
                />
              </StepIndicator>
              <div className="ml-3">
                <StepTitle>Order Details</StepTitle>
                <StepDescription>Configure album specifications</StepDescription>
              </div>
            </Step>
          </StepList>
        </Steps>

        <Card className="p-6">
          {currentStep === 1 && (
            <AlbumUpload onAlbumUploaded={handleAlbumUploaded} />
          )}
          
          {currentStep === 2 && albumFile && (
            <OrderForm albumName={albumName} albumFile={albumFile} />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateOrder;
